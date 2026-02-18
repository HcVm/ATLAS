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
    group?: {
        id: string;
        size: number;
        similarity: number;
    };
    salesHistory?: SalesHistoryItem[];
    salesCount?: number;
}

export interface SalesHistoryItem {
    id: number;
    title: string;
    fecha: string;
    precio_unitario: number;
    cantidad: number;
    orden_compra: string;
    entidad: string;
    monto_total: number;
}

export interface SalesHistoryItem {
    id: number;
    title: string;
    fecha: string;
    precio_unitario: number;
    cantidad: number;
    orden_compra: string;
    entidad: string;
    monto_total: number;
}

async function getImageEmbedding(imageUrl: string): Promise<number[] | null> {
    const rawUrl = process.env.SCRAPER_URL || 'http://127.0.0.1:8000';
    const scraperUrl = rawUrl.replace(/\/$/, '');
    try {
        const res = await fetch(`${scraperUrl}/vectorize-image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrl })
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.embedding;
    } catch (e) {
        console.error("Vectorization failed", e);
        return null;
    }
}

export async function verifyProductOnWeb(product: MarketProductDetail, extraKeywords: string = '', searchQuery: string = ''): Promise<ScrapedProduct[]> {
    try {
        // 1. Clean Core Name (Re-applying logical brand removal)
        // We do this here to ensure the scraper gets the clean query
        const brandName = product.brandName || '';
        const description = product.description || '';

        const coreName = description.split(/[:;,-]|\s\d/)[0].trim().split(/\s+/).slice(0, 4).join(" ");
        const cleanCore = coreName.replace(new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();

        // 2. Call Python Microservice
        // Note: In production this URL should be an env variable
        // Use the deployed URL if available, or localhost for dev.
        // Use the deployed URL if available, or localhost for dev.
        // Ideally this comes from process.env.SCRAPER_URL
        // Remove trailing slash if present to avoid double slash
        const rawUrl = process.env.SCRAPER_URL || 'http://127.0.0.1:8000';
        const scraperUrl = rawUrl.replace(/\/$/, '');

        console.log("Using Scraper URL:", scraperUrl);

        const response = await fetch(`${scraperUrl}/check-market`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_name: cleanCore,
                search_query: searchQuery || undefined, // send override if provided
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

export async function analyzeProductGap(formData: FormData, analysisMode: 'standard' | 'visual' = 'standard'): Promise<AnalysisResult> {
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
    // OPTIMIZATION: Also fetch image_url to help with context if needed locally, though RPC handles search.
    const { data: existingProducts, error: productsError } = await supabase
        .from('products')
        .select('id, code, name, description, image_url, brand_id, brands(name)')
        .eq('name', targetCategory);

    if (productsError) throw new Error('Failed to fetch existing products.');

    // Create lookup for EXACT match: BrandID:Code (Normalized)
    const exactMatchMap = new Set<string>();

    const systemProductsList: { id: string, code: string, description: string, brandName: string, image_url?: string }[] = [];

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
                brandName: (p.brands as any)?.name || 'Unknown',
                image_url: p.image_url
            });
        }
    });

    // 4. Fetch Sales Metrics
    // We want to know if these products have even been sold in the public sector.
    const fileCodes = jsonData
        .map(row => row['Nro. Parte o Código Único de Identificación']?.trim())
        .filter(c => c && c.length > 0) as string[];

    // Generate variations to catch case mismatches efficiently with .in()
    const queryCodes = new Set<string>();
    fileCodes.forEach(c => {
        queryCodes.add(c);
        queryCodes.add(c.toUpperCase());
        queryCodes.add(c.toLowerCase());
    });

    const uniqueQueryCodes = Array.from(queryCodes);
    const salesCounts = new Map<string, number>();

    // Process in chunks to avoid query limits
    const CHUNK_SIZE = 200; // Smaller chunk size due to expanded variations
    for (let i = 0; i < uniqueQueryCodes.length; i += CHUNK_SIZE) {
        const chunk = uniqueQueryCodes.slice(i, i + CHUNK_SIZE);

        // Fetch matching sales
        // Note: .in() finds exact matches against the provided variations
        const { data: salesMatches } = await supabase
            .from('open_data_entries')
            .select('nro_parte')
            .in('nro_parte', chunk);

        if (salesMatches) {
            salesMatches.forEach(match => {
                if (match.nro_parte) {
                    // Count Occurrences using Normalized Key (UpperCase)
                    // This creates a "Case-Insensitive Map" effectively
                    const key = match.nro_parte.toUpperCase().trim();
                    salesCounts.set(key, (salesCounts.get(key) || 0) + 1);
                }
            });
        }
    }

    // 5. Process Every Row in Excel
    const marketProducts: MarketProductDetail[] = [];
    let totalMissingInSystem = 0;

    // Batch processing helper
    const processRow = async (row: any): Promise<MarketProductDetail | null> => {
        const brandName = row['Marca']?.trim() || '';
        const lowerBrandName = brandName.toLowerCase();
        const code = row['Nro. Parte o Código Único de Identificación']?.trim() || '';
        const description = row['Descripción Ficha-Producto'] || '';

        if (!brandName || !code) return null;

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
            }
        }

        let similarSystemProduct: { id: string; code: string; brandName: string; description: string; similarityScore: number } | undefined = undefined;

        if (statusInSystem !== 'found') {
            let maxScore = 0;
            let bestMatch = null;

            // Simple linear scan for similarity.
            for (const sp of systemProductsList) {
                if (sp.brandName.toLowerCase() === lowerBrandName && sp.code.toLowerCase() === code.toLowerCase()) {
                    continue;
                }

                const score = calculateAdvancedSimilarity(description, sp.description);
                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = sp;
                }
            }

            if (maxScore > 0.45 && bestMatch) {
                similarSystemProduct = {
                    id: bestMatch.id,
                    code: bestMatch.code,
                    brandName: bestMatch.brandName,
                    description: bestMatch.description,
                    similarityScore: maxScore
                };
            }

            // --- VISUAL SEARCH FALLBACK ---
            const imageUrl = row['Imagen'];
            const hasImage = imageUrl && imageUrl.startsWith('http');

            let tryVisual = false;

            if (analysisMode === 'visual') {
                tryVisual = hasImage;
            } else {
                tryVisual = hasImage && (!similarSystemProduct || similarSystemProduct.similarityScore < 0.8);
            }

            if (tryVisual) {
                try {
                    const embedding = await getImageEmbedding(imageUrl);

                    if (embedding) {
                        const { data: visualMatches, error: rpcError } = await supabase.rpc('match_products_by_image', {
                            query_embedding: embedding,
                            match_threshold: analysisMode === 'visual' ? 0.72 : 0.82,
                            match_count: 1
                        });

                        if (!rpcError && visualMatches && visualMatches.length > 0) {
                            const vMatch = visualMatches[0];
                            const currentScore = similarSystemProduct?.similarityScore || 0;

                            let acceptVisual = false;

                            if (analysisMode === 'visual') {
                                if (vMatch.similarity > 0.72 && vMatch.similarity >= (currentScore - 0.15)) {
                                    acceptVisual = true;
                                }
                            } else {
                                if (vMatch.similarity > currentScore) {
                                    acceptVisual = true;
                                }
                            }

                            if (acceptVisual) {
                                const fullMatch = systemProductsList.find(p => p.id === vMatch.id);

                                if (fullMatch) {
                                    similarSystemProduct = {
                                        id: fullMatch.id,
                                        code: fullMatch.code,
                                        brandName: fullMatch.brandName,
                                        description: fullMatch.description,
                                        similarityScore: vMatch.similarity
                                    };
                                } else {
                                    similarSystemProduct = {
                                        id: vMatch.id,
                                        code: "VISUAL-MATCH",
                                        brandName: "Sistema",
                                        description: vMatch.description,
                                        similarityScore: vMatch.similarity
                                    };
                                }
                            }
                        }
                    }
                } catch (err) {
                    // Silent fail
                }
            }
        }

        // Generate Trusted Source Search URL
        const TRUSTED_SITES = [
            "truper-peru.com", "sodimac.com.pe", "promart.pe",
            "maquicasaperu.com", "gyasolution.pe", "tramontina.com.pe",
            "uysa.com.pe", "bellota.com", "mercadolibre.com.pe"
        ];

        const siteFilter = TRUSTED_SITES.map(s => `site:${s}`).join(" OR ");
        const coreName = description.split(/[:;,-]|\s\d/)[0].trim().split(/\s+/).slice(0, 4).join(" ");
        const cleanCore = coreName.replace(new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
        const query = `(${siteFilter}) ${cleanCore}`;
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`;

        return {
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
            verificationStatus: 'pending',
            salesCount: salesCounts.get(code.toUpperCase().trim()) || 0
        };
    };

    // Execute in Batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
        const batch = jsonData.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(processRow));

        for (const res of results) {
            if (res) {
                marketProducts.push(res);
                if (res.statusInSystem === 'missing') {
                    totalMissingInSystem++;
                }
            }
        }
    }

    // Sort: Similarity Descending, then Missing, then Competitor, then Found
    marketProducts.sort((a, b) => {
        const scoreA = a.similarSystemProduct?.similarityScore || 0;
        const scoreB = b.similarSystemProduct?.similarityScore || 0;

        // Primary Sort: Similarity Score (Desc)
        if (Math.abs(scoreA - scoreB) > 0.001) { // Float tolerance
            return scoreB - scoreA;
        }

        // Secondary Sort: Sales Count (Prioritize Rotated Products) - User Request
        const salesA = a.salesCount || 0;
        const salesB = b.salesCount || 0;
        if (salesA !== salesB) {
            return salesB - salesA; // Higher sales first
        }

        // Tertiary Sort: Status (Missing < Competitor < Found)
        const statusScore = (status: string) => {
            if (status === 'missing') return 0;
            if (status === 'competitor_only') return 1;
            return 2;
        };
        return statusScore(a.statusInSystem) - statusScore(b.statusInSystem);
    });



    // 5. Market-to-Market Clustering
    // We group products that are extremely similar to each other (ignoring Brand), to help user discard them in bulk.
    // MODIFIED: Also group by Similarity Level (High vs Low vs Null)
    const clusters: { id: string; products: MarketProductDetail[]; representativeDesc: string; similarityLevel: string }[] = [];
    let clusterCounter = 0;

    for (const product of marketProducts) {
        // We strip the brand name from the description for comparison
        const cleanDesc = product.description.replace(new RegExp(product.brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();

        // Find a matching cluster
        let bestClusterIdx = -1;
        let bestClusterScore = 0;

        for (let i = 0; i < clusters.length; i++) {
            // Compare with the first product in the cluster (or a representative string)
            // We use a high threshold (0.85) because they should be effectively the SAME product type
            // AND check if they belong to the same "Similarity Level" (High/Low/Null)
            const score = calculateAdvancedSimilarity(cleanDesc, clusters[i].representativeDesc);

            const currentLevel = (product.similarSystemProduct?.similarityScore || 0) >= 0.7 ? 'high' :
                (product.similarSystemProduct?.similarityScore || 0) >= 0.45 ? 'low' : 'null';

            if (score > 0.85 && score > bestClusterScore && currentLevel === clusters[i].similarityLevel) {
                bestClusterScore = score;
                bestClusterIdx = i;
            }
        }

        if (bestClusterIdx !== -1) {
            clusters[bestClusterIdx].products.push(product);
        } else {
            // Create new cluster
            clusterCounter++;
            clusters.push({
                id: `G-${clusterCounter}`,
                products: [product],
                representativeDesc: cleanDesc,
                // Assign a "Category Level" to the cluster based on the first product
                // This ensures we only group High with High, Low with Low.
                similarityLevel: (product.similarSystemProduct?.similarityScore || 0) >= 0.7 ? 'high' :
                    (product.similarSystemProduct?.similarityScore || 0) >= 0.45 ? 'low' : 'null'
            });
        }
    }

    // Assign Group Info to Products
    // Only assign if the group has more than 1 item
    for (const cluster of clusters) {
        if (cluster.products.length > 1) {
            cluster.products.forEach(p => {
                p.group = {
                    id: cluster.id,
                    size: cluster.products.length,
                    similarity: 0 // Placeholder, maybe can put avg similarity
                };
            });
        }
    }

    // Re-Sort to keep groups together
    // We sort by Group ID (if exists), then by original sort order
    // Actually, we want to keep the highest similarity groups at the top.
    // So we sort the CLUSTERS by their best internal product score?
    // Or simpler: Sort by HasGroup (Desc), GroupSize (Desc), OriginalScore (Desc)

    // Better strategy for UI:
    // Just ensure products with the same Group ID are adjacent.
    // We can leave the global sort as is, but in the UI we might want to "Group By"
    // For now, let's just make sure they have the data.

    // Let's grouping sort logic:
    // 1. Sort products roughly by the previous logic (SimScore Desc)
    // 2. But if a product is part of a group, we might want to pull the whole group to the position of its highest scoring member.

    // Map GroupID -> Max Score of any member
    const groupMaxScore = new Map<string, number>();
    marketProducts.forEach(p => {
        if (p.group) {
            const currentMax = groupMaxScore.get(p.group.id) || 0;
            const pScore = p.similarSystemProduct?.similarityScore || 0;
            if (pScore > currentMax) {
                groupMaxScore.set(p.group.id, pScore);
            }
        }
    });

    marketProducts.sort((a, b) => {
        const scoreA = a.group ? groupMaxScore.get(a.group.id)! : (a.similarSystemProduct?.similarityScore || 0);
        const scoreB = b.group ? groupMaxScore.get(b.group.id)! : (b.similarSystemProduct?.similarityScore || 0);

        if (Math.abs(scoreA - scoreB) > 0.001) return scoreB - scoreA;

        // 2. Tie-Breaker: Group ID (Cluster togetherness)
        if (a.group && b.group) {
            if (a.group.id !== b.group.id) {
                return a.group.id.localeCompare(b.group.id);
            }
        } else if (a.group && !b.group) {
            return -1; // Grouped items first
        } else if (!a.group && b.group) {
            return 1;
        }

        // 2.5. Secondary Sort: Sales Count (Prioritize Rotated Products)
        const salesA = a.salesCount || 0;
        const salesB = b.salesCount || 0;
        if (salesA !== salesB) {
            return salesB - salesA;
        }

        // 3. Final tie breaker: Status
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

export async function getSalesHistory(partNumber: string): Promise<SalesHistoryItem[]> {
    const supabase = await createAuthenticatedServerClient();

    // Normalize part number for search (remove special chars if needed, but strict match is safer first)
    // The user specifically pointed out "Rmsmcñ023" vs "nro_parte".
    // We should try exact match first.

    const { data, error } = await supabase
        .from('open_data_entries')
        .select(`
            id,
            descripcion_ficha_producto,
            fecha_publicacion,
            precio_unitario,
            cantidad_entrega,
            orden_electronica,
            razon_social_entidad,
            monto_total_entrega,
            nro_parte
        `)
        .ilike('nro_parte', partNumber) // Case-insensitive match
        .order('fecha_publicacion', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching sales history:", error);
        return [];
    }

    return (data || []).map(item => ({
        id: item.id,
        title: item.descripcion_ficha_producto || 'Sin Descripción',
        fecha: item.fecha_publicacion || '',
        precio_unitario: Number(item.precio_unitario) || 0,
        cantidad: Number(item.cantidad_entrega) || 0,
        orden_compra: item.orden_electronica || '',
        entidad: item.razon_social_entidad || '',
        monto_total: Number(item.monto_total_entrega) || 0
    }));
}
