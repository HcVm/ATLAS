'use server';

import { createAuthenticatedServerClient } from '@/lib/supabase-server';
import * as XLSX from 'xlsx';

// Define the structure of the row coming from the XLSX file
interface XLSXRow {
    'Acuerdo Marco'?: string;
    'Catálogo'?: string;
    'Categoría'?: string; // This maps to products.name
    'Descripción Ficha-Producto'?: string;
    'Marca'?: string;
    'Nro. Parte o Código Único de Identificación'?: string; // This maps to products.code
    'Ficha Técnica'?: string;
    'Imagen'?: string;
    'Estado Ficha - Producto'?: string;
}

export interface AnalysisResult {
    totalRowsProcessed: number;
    totalMissingInSystem: number;
    marketProducts: MarketProductDetail[];
    categoryProcessed: string;
}

export interface ScrapedProduct {
    source: string;
    title: string;
    price: string;
    link: string;
    similarity_score: number;
}

export interface MarketProductDetail {
    brandName: string;
    code: string;
    description: string;
    category: string;
    status: string;
    image?: string;
    technicalSheet?: string;
    isSystemBrand: boolean; // Is this brand one of ours?
    statusInSystem: 'found' | 'missing' | 'competitor_only'; // Found in DB, Missing (My Brand but not in DB), or Competitor
    similarSystemProduct?: {
        id: string;
        code: string;
        brandName: string;
        description: string;
        similarityScore: number; // 0 to 1
    };
    googleSearchUrl?: string;
    verificationStatus?: 'pending' | 'verified_real' | 'suspicious' | 'not_found';
    scrapedData?: ScrapedProduct[];
}

export async function verifyProductOnWeb(product: MarketProductDetail, extraKeywords: string = ''): Promise<ScrapedProduct[]> {
    try {
        // 1. Clean Core Name (Re-applying logical brand removal)
        // We do this here to ensure the scraper gets the clean query
        const brandName = product.brandName || '';
        const description = product.description || '';

        const coreName = description.split(/[:;,-]|\s\d/)[0].trim().split(/\s+/).slice(0, 4).join(" ");
        const cleanCore = coreName.replace(new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();

        // 2. Call Python Microservice
        // Note: In production this URL should be an env variable
        const response = await fetch('http://127.0.0.1:8000/check-market', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_name: cleanCore,
                extra_keywords: extraKeywords
            }),
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error('Scraper API responded with error:', response.status);
            return [];
        }

        const data = await response.json();
        return data as ScrapedProduct[];

    } catch (error) {
        console.error('Failed to connect to Scraper Service:', error);
        // Fallback: If scraper is down, return empty array so UI can handle gracefully
        return [];
    }
}

// Helper to extract technical specifications
type SpecMap = Map<string, number[]>;

function extractSpecs(text: string): SpecMap {
    const specs = new Map<string, number[]>();
    // Look for number + unit pattern, allowing decimals and common units
    // Added more units like "PULG" (inches) or simple dimensions
    const regex = /(\d+(?:[.,]\d+)?)\s*(MM|CM|M|GR|KG|KW|HP|V|W|LT|GAL|PULG|")/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const value = parseFloat(match[1].replace(',', '.'));
        // Normalize units
        let unit = match[2].toUpperCase();
        if (unit === '"') unit = 'PULG';

        const current = specs.get(unit) || [];
        current.push(value);
        specs.set(unit, current);
    }
    return specs;
}

// Improved similarity calculation with Tolerance
function calculateAdvancedSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    // 1. Spec Similarity (Fuzzy Match with 10% Tolerance)
    const specs1 = extractSpecs(str1);
    const specs2 = extractSpecs(str2);

    let matchCount = 0;
    let totalItems1 = 0;

    // Calculate matches
    specs1.forEach((values1, unit) => {
        totalItems1 += values1.length;
        if (specs2.has(unit)) {
            const values2 = [...specs2.get(unit)!]; // Copy to consume matches

            for (const v1 of values1) {
                // Find best match within 10% tolerance
                // We prefer the closest value if multiple exist
                let bestMatchIndex = -1;
                let minDiff = Infinity;

                values2.forEach((v2, idx) => {
                    const diff = Math.abs(v1 - v2);
                    const tolerance = v1 * 0.10; // 10% tolerance (User Request)

                    if (diff <= tolerance && diff < minDiff) {
                        minDiff = diff;
                        bestMatchIndex = idx;
                    }
                });

                if (bestMatchIndex !== -1) {
                    matchCount++;
                    values2.splice(bestMatchIndex, 1); // Remove used match so it's not counted twice
                }
            }
        }
    });

    let totalItems2 = 0;
    specs2.forEach((values) => totalItems2 += values.length);

    let specScore = 0;
    // Jaccard Index for fuzzy sets: Intersection / Union
    // Union = Set1 + Set2 - Intersection
    const unionSize = totalItems1 + totalItems2 - matchCount;

    if (unionSize > 0) {
        specScore = matchCount / unionSize;
    } else if (totalItems1 === 0 && totalItems2 === 0) {
        specScore = 0.5; // Neutral if no specs to compare
    }

    // 2. Text Similarity (Token based, Jaccard)
    const tokenize = (s: string) => s.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 2 && isNaN(Number(t))); // Filter numbers out here to assume they are specs

    const tokens1 = new Set(tokenize(str1));
    const tokens2 = new Set(tokenize(str2));

    let textScore = 0;
    if (tokens1.size > 0 || tokens2.size > 0) {
        const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
        const union = new Set([...tokens1, ...tokens2]);
        textScore = intersection.size / union.size;
    }

    // Weighted Average
    // If specs are present, they are dominant.
    if (totalItems1 > 0 || totalItems2 > 0) {
        return (specScore * 0.75) + (textScore * 0.25);
    } else {
        return textScore;
    }
}

export async function analyzeProductGap(formData: FormData): Promise<AnalysisResult> {
    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file uploaded');
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<XLSXRow>(worksheet);

    if (jsonData.length === 0) {
        throw new Error('The uploaded file is empty');
    }

    // 1. Get the Category from the file
    const targetCategory = jsonData[0]['Categoría']?.trim();

    if (!targetCategory) {
        throw new Error('Could not identify a Category in the uploaded file.');
    }

    const supabase = await createAuthenticatedServerClient();

    // 2. Fetch System Brands (Your Brands)
    const { data: systemBrands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name');

    if (brandsError) throw new Error('Failed to fetch system brands.');

    const brandMap = new Map<string, string>(); // Name(lower) -> ID
    const systemBrandNames = new Set<string>(); // Name(lower)

    systemBrands?.forEach((b) => {
        if (b.name) {
            const lowerName = b.name.toLowerCase().trim();
            brandMap.set(lowerName, b.id);
            systemBrandNames.add(lowerName);
        }
    });

    // 3. Fetch ALL Existing Products for this Category
    const { data: existingProducts, error: productsError } = await supabase
        .from('products')
        .select('id, code, name, description, brand_id, brands(name)')
        .eq('name', targetCategory);

    if (productsError) throw new Error('Failed to fetch existing products.');

    // Create lookup for EXACT match: BrandID:Code (Normalized)
    const exactMatchMap = new Set<string>();

    const systemProductsList: { id: string, code: string, description: string, brandName: string }[] = [];

    existingProducts?.forEach(p => {
        // Store exact match key - NORMALIZED (LowerCase)
        if (p.brand_id && p.code) {
            exactMatchMap.add(`${p.brand_id}:${p.code.trim().toLowerCase()}`);
        }

        // Store list for similarity search
        if (p.description) {
            systemProductsList.push({
                id: p.id,
                code: p.code,
                description: p.description,
                brandName: (p.brands as any)?.name || 'Unknown'
            });
        }
    });

    // 4. Process Every Row in Excel
    const marketProducts: MarketProductDetail[] = [];
    let totalMissingInSystem = 0;

    for (const row of jsonData) {
        const brandName = row['Marca']?.trim() || '';
        const lowerBrandName = brandName.toLowerCase();
        const code = row['Nro. Parte o Código Único de Identificación']?.trim() || '';
        const description = row['Descripción Ficha-Producto'] || '';

        if (!brandName || !code) continue;

        const isSystemBrand = systemBrandNames.has(lowerBrandName);
        const brandId = isSystemBrand ? brandMap.get(lowerBrandName) : null;

        let statusInSystem: 'found' | 'missing' | 'competitor_only' = 'competitor_only';

        // Check Exact Match (Verified with LowerCase)
        if (isSystemBrand && brandId) {
            const key = `${brandId}:${code.toLowerCase()}`;
            if (exactMatchMap.has(key)) {
                statusInSystem = 'found';
            } else {
                statusInSystem = 'missing';
                totalMissingInSystem++;
            }
        }

        // Check Similarity
        let similarSystemProduct = undefined;

        if (statusInSystem !== 'found') {
            let maxScore = 0;
            let bestMatch = null;

            // Simple linear scan for similarity.
            for (const sp of systemProductsList) {
                // Skip comparing against itself if it's the same brand/code but somehow missed exact match
                if (sp.brandName.toLowerCase() === lowerBrandName && sp.code.toLowerCase() === code.toLowerCase()) {
                    continue;
                }

                const score = calculateAdvancedSimilarity(description, sp.description);
                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = sp;
                }
            }

            if (maxScore > 0.45 && bestMatch) { // Threshold for relevance
                similarSystemProduct = {
                    id: bestMatch.id,
                    code: bestMatch.code,
                    brandName: bestMatch.brandName,
                    description: bestMatch.description,
                    similarityScore: maxScore
                };
            }
        }

        // Generate Trusted Source Search URL
        // We filter by the specific reliable domains requested by the user.
        const TRUSTED_SITES = [
            "truper-peru.com", "sodimac.com.pe", "promart.pe",
            "maquicasaperu.com", "gyasolution.pe", "tramontina.com.pe",
            "uysa.com.pe", "bellota.com", "mercadolibre.com.pe"
        ];

        const siteFilter = TRUSTED_SITES.map(s => `site:${s}`).join(" OR ");

        // Strategy: Search for Product Type + Technical Specs ONLY (No Brand/Code/Model)
        // 1. Extract Core Name (e.g., "MACHETE CON MANGO")
        // Split by punctuation first, then take the first part.
        const coreName = description.split(/[:;,-]|\s\d/)[0].trim().split(/\s+/).slice(0, 4).join(" ");

        // 2. Extract Specs string for query (e.g. "680 MM" "560 MM")
        // We use a simplified regex to grab the number+unit combos directly from the text
        const specMatches = description.match(/(\d+(?:[.,]\d+)?)\s*(MM|CM|M|GR|KG|KW|HP|V|W|LT|GAL|PULG|")/gi) || [];
        // Take unique specs (using Set) and join them
        const uniqueSpecs = Array.from(new Set(specMatches)).join(" ");

        // 3. Construct Query
        // Remove Brand Name from Core Name to be completely agnostic (Find generic equivalents)
        const cleanCore = coreName.replace(new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
        // Use ONLY the Clean Core Name to avoid over-filtering
        const query = `(${siteFilter}) ${cleanCore}`;

        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;

        marketProducts.push({
            brandName,
            code,
            description,
            category: targetCategory,
            status: row['Estado Ficha - Producto'] || '',
            image: row['Imagen'],
            technicalSheet: row['Ficha Técnica'],
            isSystemBrand,
            statusInSystem,
            similarSystemProduct,
            googleSearchUrl,
            verificationStatus: 'pending' as const
        });
    }

    // Sort: Similarity Descending, then Missing, then Competitor, then Found
    marketProducts.sort((a, b) => {
        const scoreA = a.similarSystemProduct?.similarityScore || 0;
        const scoreB = b.similarSystemProduct?.similarityScore || 0;

        // Primary Sort: Similarity Score (Desc)
        if (Math.abs(scoreA - scoreB) > 0.001) { // Float tolerance
            return scoreB - scoreA;
        }

        // Secondary Sort: Status (Missing < Competitor < Found)
        const statusScore = (status: string) => {
            if (status === 'missing') return 0;
            if (status === 'competitor_only') return 1;
            return 2;
        };
        return statusScore(a.statusInSystem) - statusScore(b.statusInSystem);
    });

    return {
        totalRowsProcessed: jsonData.length,
        totalMissingInSystem,
        marketProducts,
        categoryProcessed: targetCategory
    };
}
