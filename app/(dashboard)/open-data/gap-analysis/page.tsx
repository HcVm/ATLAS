'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Search, CheckCircle, AlertTriangle, XCircle, Info, ExternalLink, Loader2, Eye, DollarSign, FileText, TrendingUp, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { analyzeProductGap, AnalysisResult, MarketProductDetail, verifyProductOnWeb, ScrapedProduct, getSalesHistory, SalesHistoryItem } from './actions';

export default function ProductGapAnalysisPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleAnalyze = async () => {
        if (!file) {
            toast.error('Por favor selecciona un archivo primero');
            return;
        }

        setIsAnalyzing(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const data = await analyzeProductGap(formData);
            setResult(data);
            if (data.totalMissingInSystem > 0) {
                toast.success(`Análisis completado: ${data.totalMissingInSystem} brechas detectadas en tus marcas.`);
            } else {
                toast.info('Análisis completado. Revise las comparaciones de mercado.');
            }
        } catch (error) {
            console.error(error);
            toast.error('Error al analizar el archivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getSimilarityColor = (score: number) => {
        if (score >= 0.8) return "bg-green-500";
        if (score >= 0.5) return "bg-yellow-500";
        return "bg-slate-400";
    };

    return (
        <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Análisis de Brechas de Mercado
                </h1>
                <p className="text-muted-foreground max-w-2xl">
                    Sube tus catálogos de Perú Compras para comparar automáticamente contra toda la base de datos.
                    Detecta productos faltantes en tus marcas y encuentra equivalencias en la competencia.
                </p>
            </div>

            {/* Upload Section */}
            <Card className="border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-end gap-6">
                        <div className="grid w-full max-w-md items-center gap-2">
                            <Label htmlFor="file-upload" className="font-semibold text-foreground">Archivo Excel (.xlsx)</Label>
                            <Input
                                id="file-upload"
                                type="file"
                                accept=".xlsx"
                                onChange={handleFileChange}
                                disabled={isAnalyzing}
                                className="file:text-indigo-600 file:font-semibold hover:file:bg-indigo-50 file:border-0 file:bg-transparent file:mr-4 cursor-pointer"
                            />
                        </div>
                        <Button
                            onClick={handleAnalyze}
                            disabled={!file || isAnalyzing}
                            className="w-full md:w-auto min-w-[160px] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md transition-all hover:scale-105"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Search className="mr-2 h-4 w-4 animate-spin" /> Analizando...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" /> Ejecutar Análisis
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {result && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="bg-slate-50 dark:bg-slate-900/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Categoría</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-lg font-bold text-indigo-600 truncate" title={result.categoryProcessed}>
                                    {result.categoryProcessed}
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-slate-50 dark:bg-slate-900/50">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Mercado</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{result.totalRowsProcessed}</div>
                                <p className="text-xs text-muted-foreground">Productos analizados</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Brechas Críticas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{result.totalMissingInSystem}</div>
                                <p className="text-xs text-red-600/80 dark:text-red-400/80">Tus productos faltantes</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">Coincidencias</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {result.marketProducts.filter(p => p.statusInSystem === 'found').length}
                                </div>
                                <p className="text-xs text-green-600/80 dark:text-green-400/80">Encontrados en DB</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full h-auto md:h-auto md:w-auto grid-cols-2 md:grid-cols-5 gap-2">
                            <TabsTrigger value="all">Todo</TabsTrigger>
                            <TabsTrigger value="high_sim" className="data-[state=active]:text-green-600">
                                Alta ({result.marketProducts.filter(p => p.similarSystemProduct && p.similarSystemProduct.similarityScore >= 0.7).length})
                            </TabsTrigger>
                            <TabsTrigger value="low_sim" className="data-[state=active]:text-yellow-600">
                                Baja ({result.marketProducts.filter(p => p.similarSystemProduct && p.similarSystemProduct.similarityScore < 0.7).length})
                            </TabsTrigger>
                            <TabsTrigger value="no_sim" className="data-[state=active]:text-slate-500">
                                Nula ({result.marketProducts.filter(p => !p.similarSystemProduct).length})
                            </TabsTrigger>
                            <TabsTrigger value="missing" className="data-[state=active]:text-red-600">
                                Brechas ({result.totalMissingInSystem})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Panorama Completo del Mercado</CardTitle>
                                    <CardDescription>
                                        Listado de todos los productos en el archivo y su relación con tu base de datos.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ProductTable products={result.marketProducts} />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="high_sim" className="mt-4">
                            <Card className="border-green-200 dark:border-green-900/50">
                                <CardHeader>
                                    <CardTitle className="text-green-600 dark:text-green-400 flex items-center gap-2">
                                        <CheckCircle className="h-5 w-5" />
                                        Alta Similitud ({'>'}70%)
                                    </CardTitle>
                                    <CardDescription>
                                        Productos con alta probabilidad de ser equivalentes a los de tu catálogo.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ProductTable
                                        products={result.marketProducts.filter(p => p.similarSystemProduct && p.similarSystemProduct.similarityScore >= 0.7)}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="low_sim" className="mt-4">
                            <Card className="border-yellow-200 dark:border-yellow-900/50">
                                <CardHeader>
                                    <CardTitle className="text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        Baja Similitud ({'<'}70%)
                                    </CardTitle>
                                    <CardDescription>
                                        Productos que podrían ser equivalentes pero requieren revisión manual.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ProductTable
                                        products={result.marketProducts.filter(p => p.similarSystemProduct && p.similarSystemProduct.similarityScore < 0.7)}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="no_sim" className="mt-4">
                            <Card className="border-slate-200 dark:border-slate-800">
                                <CardHeader>
                                    <CardTitle className="text-slate-500 flex items-center gap-2">
                                        <Info className="h-5 w-5" />
                                        Sin Coincidencias
                                    </CardTitle>
                                    <CardDescription>
                                        Productos que no pudieron ser emparejados automáticamente con el catálogo (Similitud mayor a 45% no encontrada).
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ProductTable
                                        products={result.marketProducts.filter(p => !p.similarSystemProduct)}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="missing" className="mt-4">
                            <Card className="border-red-200 dark:border-red-900/50">
                                <CardHeader>
                                    <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5" />
                                        Acción Requerida: Crear Fichas
                                    </CardTitle>
                                    <CardDescription>
                                        Estos productos pertenecen a tus marcas representadas pero no existen en el sistema.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ProductTable
                                        products={result.marketProducts.filter(p => p.statusInSystem === 'missing')}
                                        hideSimilarity={true}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
}


function generateSearchOptions(description: string, brandName: string): string[] {
    // Basic cleaning to remove brand and garbage chars
    let clean = description || "";
    if (brandName) {
        clean = clean.replace(new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
    }
    // Remove technical part (usually after punctuation or numbers)
    // e.g. "RASTRILLO METAL 14 D" -> "RASTRILLO METAL"
    clean = clean.split(/[,:;.-]|\s\d/)[0].trim();

    const words = clean.split(/\s+/);
    const options = new Set<string>();

    // Option 1: First Word only (Broadest)
    if (words.length > 0 && words[0].length > 1) {
        options.add(words[0]);
    }

    // Option 2: First 2 Words (Moderate)
    if (words.length > 1) {
        options.add(words.slice(0, 2).join(" "));
    }

    // Option 3: Full Core Concept (Specific - up to 4 words)
    if (words.length > 0) {
        options.add(words.slice(0, 4).join(" "));
    }

    return Array.from(options);
}

const WinnerStars = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
        {/* Stronger Radial Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.15),transparent_70%)]" />

        {/* Main Sparkles - Much more visible */}
        <Sparkles className="absolute top-2 right-4 w-5 h-5 text-yellow-500 fill-yellow-500/20 animate-pulse" style={{ animationDuration: '3s' }} />
        <div className="absolute top-3 right-3 w-6 h-6 bg-yellow-400/20 blur-xl rounded-full" /> {/* Glow for top right sparkle */}

        <Sparkles className="absolute bottom-3 left-12 w-4 h-4 text-amber-500 fill-amber-500/20 animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }} />

        {/* Smaller Twinkles */}
        <Sparkles className="absolute top-1/2 left-1/4 w-3 h-3 text-yellow-600 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
        <Sparkles className="absolute bottom-1/3 right-1/3 w-2 h-2 text-emerald-500 animate-ping" style={{ animationDuration: '3s', animationDelay: '1.5s' }} />

        {/* Subtle Shine/Beam */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-100/10 to-transparent opacity-50" />
    </div>
);

function ProductTable({ products, hideSimilarity = false }: { products: MarketProductDetail[], hideSimilarity?: boolean }) {
    const [verifyingProduct, setVerifyingProduct] = useState<MarketProductDetail | null>(null);
    const [scanResults, setScanResults] = useState<ScrapedProduct[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // New States for "Pre-Scan" Input
    const [extraKeywords, setExtraKeywords] = useState("");
    const [hasStartedScan, setHasStartedScan] = useState(false);

    // New: User Selection for Base Query
    const [queryOptions, setQueryOptions] = useState<string[]>([]);
    const [selectedQuery, setSelectedQuery] = useState("");
    const [customQuery, setCustomQuery] = useState(""); // If user types manually
    const [useCustomQuery, setUseCustomQuery] = useState(false);

    // Sales History State
    const [salesHistory, setSalesHistory] = useState<SalesHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    React.useEffect(() => {
        if (verifyingProduct?.code) {
            setLoadingHistory(true);
            getSalesHistory(verifyingProduct.code)
                .then(setSalesHistory)
                .catch(err => console.error(err))
                .finally(() => setLoadingHistory(false));
        } else {
            setSalesHistory([]);
        }
    }, [verifyingProduct]);

    const handleScanClick = (product: MarketProductDetail) => {
        setVerifyingProduct(product);
        setExtraKeywords("");
        setHasStartedScan(false);
        setScanResults([]);

        // Generate Options
        const opts = generateSearchOptions(product.description, product.brandName);
        setQueryOptions(opts);
        // Default to the most specific (longest) one usually, or the middle?
        // Let's default to the longest one (last added usually)
        if (opts.length > 0) {
            setSelectedQuery(opts[opts.length - 1]);
        } else {
            setSelectedQuery("");
        }
        setUseCustomQuery(false);
        setCustomQuery("");
    };

    // State for viewing group details
    const [viewingGroup, setViewingGroup] = useState<{ id: string, products: MarketProductDetail[], systemProduct?: any } | null>(null);

    const handleGroupClick = (groupId: string) => {
        const groupProducts = products.filter(p => p.group?.id === groupId);
        // Assuming all products in the group match the same system product (if any)
        const representative = groupProducts.find(p => p.similarSystemProduct) || groupProducts[0];
        setViewingGroup({
            id: groupId,
            products: groupProducts,
            systemProduct: representative.similarSystemProduct
        });
    };

    // Calculate visible group sizes for the current filtered list
    const visibleGroupCounts = products.reduce((acc, product) => {
        if (product.group?.id) {
            acc[product.group.id] = (acc[product.group.id] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const executeScan = async () => {
        if (!verifyingProduct) return;

        setIsScanning(true);
        setHasStartedScan(true);
        setScanResults([]);

        const baseQuery = useCustomQuery ? customQuery : selectedQuery;

        // Prepare Payload locally to avoid server action delay
        const brandName = verifyingProduct.brandName || '';
        const description = verifyingProduct.description || '';
        // Same cleaning logic as before
        const coreName = description.split(/[:;,-]|\s\d/)[0].trim().split(/\s+/).slice(0, 4).join(" ");
        const cleanCore = coreName.replace(new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();

        try {
            const response = await fetch('/api/market-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_name: cleanCore,
                    search_query: baseQuery,
                    extra_keywords: extraKeywords,
                    brand_name: brandName,
                    description: description
                })
            });

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const newResult = JSON.parse(line);
                            setScanResults(prev => [...prev, newResult]);
                        } catch (e) {
                            console.error("Stream Parse Error", e);
                        }
                    }
                }
            }
        } catch (error) {
            toast.error('Error al conectar con el servicio de scraping');
            console.error(error);
        } finally {
            setIsScanning(false);
        }
    };

    const handleRetry = () => {
        setHasStartedScan(false);
        setScanResults([]);
    };

    if (products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mb-2 opacity-20" />
                <p>No hay datos para mostrar en esta vista.</p>
            </div>
        );
    }

    return (
        <>
            <ScrollArea className="h-[600px] w-full border rounded-md relative bg-white dark:bg-background">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-50 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
                        <TableRow>
                            <TableHead className="w-[180px]">Marca</TableHead>
                            <TableHead className="w-[150px]">Código / Parte</TableHead>
                            <TableHead className="min-w-[300px]">Descripción Mercado</TableHead>
                            <TableHead className="w-[100px]">Estado</TableHead>
                            <TableHead className="w-[120px]">Situación</TableHead>
                            {!hideSimilarity && <TableHead className="w-[300px]">Similitud en DB</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product, idx) => {
                            const isNewGroup = product.group && (idx === 0 || products[idx - 1].group?.id !== product.group.id);
                            const isInGroup = !!product.group;
                            return (
                                <React.Fragment key={idx}>
                                    {isNewGroup && (
                                        <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-t border-slate-200 dark:border-slate-700">
                                            <TableCell colSpan={hideSimilarity ? 5 : 5} className="py-3">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                        <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                                            Grupo de {product.group?.id ? visibleGroupCounts[product.group.id] : 0} productos
                                                        </span>
                                                        <span>Productos de mercado idénticos</span>
                                                    </div>

                                                    {/* Show Similarity Card HERE for the whole group */}
                                                    {!hideSimilarity && product.similarSystemProduct && (
                                                        <div className="mt-1 flex items-start gap-4 p-3 bg-white dark:bg-black/20 rounded border border-slate-200 dark:border-slate-800/50 shadow-sm max-w-3xl">
                                                            <div className="text-xs font-medium text-muted-foreground whitespace-nowrap pt-1">Similar en DB:</div>
                                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-bold text-sm text-foreground">{product.similarSystemProduct.brandName}</span>
                                                                        <Badge className={`text-[10px] h-5 ${product.similarSystemProduct.similarityScore > 0.7 ? 'bg-green-500' :
                                                                            product.similarSystemProduct.similarityScore > 0.4 ? 'bg-yellow-500' : 'bg-slate-400'
                                                                            }`}>
                                                                            {(product.similarSystemProduct.similarityScore * 100).toFixed(0)}% Coincidencia
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground line-clamp-2">
                                                                        {product.similarSystemProduct.description}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    <span className="text-muted-foreground">Código:</span>
                                                                    <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-foreground">
                                                                        {product.similarSystemProduct.code}
                                                                    </code>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            {/* Spacer Cell for Alignment */}
                                            {!hideSimilarity && <TableCell className="p-0" />}
                                        </TableRow>
                                    )}
                                    <TableRow className={`
                                        transition-colors
                                        ${(product.salesCount || 0) > 0
                                            ? "bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 dark:from-emerald-950/30 dark:via-green-900/20 dark:to-emerald-950/30 border-l-4 border-l-emerald-500 shadow-sm"
                                            : isInGroup
                                                ? "bg-indigo-50/30 hover:bg-indigo-50/50 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20"
                                                : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                                        }
                                    `}>
                                        <TableCell className="align-top relative">
                                            {isInGroup && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-300 dark:bg-indigo-700" />
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">{product.brandName}</span>
                                            </div>
                                            {product.isSystemBrand && (
                                                <Badge variant="outline" className="text-[10px] mt-1 ml-2 border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/20">Tu Marca</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-mono text-xs text-slate-500">{product.code}</span>
                                                {(product.salesCount || 0) > 0 && (
                                                    <Badge variant="secondary" className="text-[10px] w-fit bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 px-1.5 h-5 flex items-center gap-1 cursor-help" title={`Este producto ha sido vendido ${(product.salesCount || 0)} veces en compras públicas registradas.`}>
                                                        <TrendingUp className="h-3 w-3" />
                                                        {(product.salesCount || 0) > 1 ? `${product.salesCount} Ventas` : '1 Venta'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="align-top relative">
                                            {(product.salesCount || 0) > 0 && <WinnerStars />}
                                            <div className="flex flex-col gap-1 relative z-10">
                                                <span className="text-xs font-medium leading-snug">{product.description}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <Badge variant="secondary" className="text-[10px] h-5 whitespace-nowrap">
                                                {product.status || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            {product.statusInSystem === 'missing' ? (
                                                <Badge variant="destructive" className="text-[10px] h-5 bg-rose-100 text-rose-700 hover:bg-rose-100 border-rose-200">
                                                    Faltante
                                                </Badge>
                                            ) : product.statusInSystem === 'found' ? (
                                                <Badge className="text-[10px] h-5 bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                    En Sistema
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] h-5 text-slate-500 border-slate-200 bg-slate-50">
                                                    Competencia
                                                </Badge>
                                            )}
                                        </TableCell>
                                        {
                                            !hideSimilarity && (
                                                <TableCell className="align-top">
                                                    {/* If in group, we showed the main match in the header. Only show INDIVIDUAL match if it differs significanty? 
                                                    Per user request: "show directly only 1 our sheet... to save space". 
                                                    So for grouped items, we render NOTHING here (or a "See Header" indicator). 
                                                    For non-grouped, we render the card as usual.
                                                */}

                                                    {/* 
                                                    If in group AND has a match, we showed the main match in the header. Show "See Header" indicator.
                                                    If in group BUT NO MATCH (Sin Coincidencias), showcase the individual actions (Scan Market).
                                                */}

                                                    {!isInGroup || !product.similarSystemProduct ? (
                                                        <div className="flex flex-col gap-2">
                                                            {product.similarSystemProduct ? (
                                                                <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-semibold text-xs text-foreground/90">{product.similarSystemProduct.brandName}</span>
                                                                        <Badge className={`text-[10px] h-5 ${product.similarSystemProduct.similarityScore > 0.7 ? 'bg-green-500 hover:bg-green-600' :
                                                                            product.similarSystemProduct.similarityScore > 0.4 ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-slate-400'
                                                                            }`}>
                                                                            {(product.similarSystemProduct.similarityScore * 100).toFixed(0)}% Similar
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground line-clamp-2" title={product.similarSystemProduct.description}>
                                                                        {product.similarSystemProduct.description}
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                                                                        <span>Code:</span>
                                                                        <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-slate-700 dark:text-slate-300">
                                                                            {product.similarSystemProduct.code}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center text-xs text-slate-300 dark:text-slate-700 italic py-1">
                                                                    Sin similitudes
                                                                </div>
                                                            )}

                                                            {/* Web Verification for Low Similarity items */}
                                                            {(!product.similarSystemProduct || product.similarSystemProduct.similarityScore < 0.6) && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 text-[10px] w-full border-dashed text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                                    onClick={() => handleScanClick(product)}
                                                                >
                                                                    <Search className="h-3 w-3 mr-1" />
                                                                    Escanear Mercado
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2 items-center justify-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 h-8"
                                                                onClick={() => product.group && handleGroupClick(product.group.id)}
                                                            >
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                Ver Grupo
                                                            </Button>

                                                            {/* Restore Scan Button for Low Similarity items even in groups */}
                                                            {product.similarSystemProduct && product.similarSystemProduct.similarityScore < 0.6 && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-7 text-[10px] w-full border-dashed text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                                    onClick={() => handleScanClick(product)}
                                                                >
                                                                    <Search className="h-3 w-3 mr-1" />
                                                                    Escanear
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                            )
                                        }
                                    </TableRow>
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </ScrollArea>

            <Dialog open={!!verifyingProduct} onOpenChange={(open) => !open && setVerifyingProduct(null)}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader className="px-6 py-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                        <DialogTitle>Verificación de Mercado</DialogTitle>
                        <DialogDescription>
                            Buscando coincidencias y precios en la web para este producto.
                        </DialogDescription>
                        {verifyingProduct && (
                            <div className="mt-4 flex gap-4 p-3 bg-white dark:bg-slate-950 rounded-lg border shadow-sm">
                                {verifyingProduct.image && (
                                    <div className="h-32 w-32 flex-shrink-0 bg-white rounded border border-slate-100 overflow-hidden flex items-center justify-center p-1">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={verifyingProduct.image}
                                            alt={verifyingProduct.brandName}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <h3 className="font-semibold text-sm text-foreground mb-1" title={verifyingProduct.description}>
                                        {verifyingProduct.description}
                                    </h3>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{verifyingProduct.brandName}</span>
                                        <span>•</span>
                                        <span className="font-mono">{verifyingProduct.code}</span>
                                    </div>
                                </div>
                                {verifyingProduct.technicalSheet && (
                                    <div className="flex flex-col justify-center pl-2 ml-2 border-l border-slate-100 dark:border-slate-800">
                                        <a
                                            href={verifyingProduct.technicalSheet}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex flex-col items-center justify-center p-2 h-full min-w-[3rem] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-md transition-colors border border-transparent hover:border-rose-100"
                                            title="Ver Ficha Técnica"
                                        >
                                            <FileText className="h-6 w-6" />
                                            <span className="text-[10px] font-bold mt-1">PDF FICHA TÉCNICA</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogHeader>

                    <Tabs defaultValue="web" className="flex-1 overflow-hidden flex flex-col w-full h-full">
                        <div className="px-6 border-b bg-slate-50/30 dark:bg-slate-900/30">
                            <TabsList className="w-full justify-start h-10 p-0 bg-transparent">
                                <TabsTrigger
                                    value="web"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 px-4 h-10 data-[state=active]:bg-transparent font-medium"
                                >
                                    Búsqueda Web {scanResults.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5">{scanResults.length}</Badge>}
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 px-4 h-10 data-[state=active]:bg-transparent font-medium"
                                >
                                    Historial Compras {salesHistory.length > 0 && <Badge variant="secondary" className="ml-2 h-5 px-1.5">{salesHistory.length}</Badge>}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="web" className="flex-1 overflow-y-auto p-0 mt-0">
                            <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
                                {!hasStartedScan ? (
                                    // INPUT FORM VIEW
                                    <div className="flex flex-col gap-6 py-6 px-4">
                                        {/* Base Search Query Selection */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm font-semibold text-foreground">
                                                    Término Base de Búsqueda
                                                </Label>
                                                <span className="text-[10px] text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full dark:bg-slate-800">
                                                    Recomendado
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2">
                                                {queryOptions.map((opt, i) => {
                                                    const isSelected = !useCustomQuery && selectedQuery === opt;
                                                    return (
                                                        <div
                                                            key={i}
                                                            onClick={() => { setSelectedQuery(opt); setUseCustomQuery(false); }}
                                                            className={`
                                                        relative flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200
                                                        ${isSelected
                                                                    ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-none'
                                                                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'}
                                                    `}
                                                        >
                                                            <div className={`
                                                        w-4 h-4 rounded-full border mr-3 flex items-center justify-center transition-colors
                                                        ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}
                                                    `}>
                                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                            </div>
                                                            <span className={`text-sm font-medium ${isSelected ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-600'}`}>
                                                                {opt}
                                                            </span>
                                                        </div>
                                                    );
                                                })}

                                                <div
                                                    onClick={() => setUseCustomQuery(true)}
                                                    className={`
                                                relative p-3 rounded-lg border cursor-pointer transition-all duration-200
                                                ${useCustomQuery
                                                            ? 'border-indigo-500 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/20 shadow-none'
                                                            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'}
                                            `}
                                                >
                                                    <div className="flex items-center mb-2">
                                                        <div className={`
                                                    w-4 h-4 rounded-full border mr-3 flex items-center justify-center transition-colors
                                                    ${useCustomQuery ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}
                                                `}>
                                                            {useCustomQuery && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                        </div>
                                                        <span className={`text-sm font-medium ${useCustomQuery ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-600'}`}>
                                                            Personalizado
                                                        </span>
                                                    </div>
                                                    {useCustomQuery && (
                                                        <div className="pl-7">
                                                            <Input
                                                                value={customQuery}
                                                                onChange={(e) => setCustomQuery(e.target.value)}
                                                                placeholder="Escribe tu término base..."
                                                                className="h-9 text-sm bg-white dark:bg-slate-950"
                                                                autoFocus
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Extra Keywords */}
                                        <div className="space-y-2">
                                            <Label htmlFor="extra-keywords" className="text-sm font-semibold text-foreground">
                                                Palabras Clave Adicionales (Opcional)
                                            </Label>
                                            <p className="text-xs text-muted-foreground">
                                                Agrega características específicas (ej: "14 dientes", "3kg") para filtrar los resultados encontrados.
                                            </p>
                                            <Input
                                                id="extra-keywords"
                                                placeholder="Ej: 14 Dientes"
                                                value={extraKeywords}
                                                onChange={(e) => setExtraKeywords(e.target.value)}
                                                className="h-10 text-base"
                                                onKeyDown={(e) => e.key === 'Enter' && executeScan()}
                                                autoFocus={!useCustomQuery}
                                            />
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="outline" onClick={() => setVerifyingProduct(null)}>Cancelar</Button>
                                            <Button onClick={executeScan} className="bg-indigo-600 hover:bg-indigo-700 text-white scan-btn">
                                                <Search className="mr-2 h-4 w-4" /> Buscar en Mercado
                                            </Button>
                                        </div>
                                    </div>
                                ) : (isScanning && scanResults.length === 0) ? (
                                    <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
                                        <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
                                        <p className="text-sm text-muted-foreground animate-pulse">
                                            Buscando "{extraKeywords}" en Truper, Kamasa, Sodimac y MercadoLibre...
                                        </p>
                                    </div>
                                ) : scanResults.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resultados ({scanResults.length})</div>
                                                {isScanning && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
                                            </div>

                                            {!isScanning && (
                                                <Button variant="ghost" size="sm" onClick={handleRetry} className="h-6 text-xs text-indigo-600 hover:bg-indigo-50">
                                                    Modificar Búsqueda
                                                </Button>
                                            )}
                                        </div>
                                        {scanResults.map((result, i) => {
                                            const isTruper = result.source === 'Truper-Catalogo';
                                            const isKamasa = result.source.toLowerCase().includes('kamasa');

                                            return (
                                                <div key={i} className={`animate-in slide-in-from-bottom-2 duration-300 flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-3
                                            ${isTruper
                                                        ? 'border-orange-200 bg-orange-50/80 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950/20 shadow-sm'
                                                        : isKamasa
                                                            ? 'border-yellow-200 bg-yellow-50/80 hover:bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-950/20 shadow-sm'
                                                            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/30'
                                                    }
                                        `}>
                                                    <div className="space-y-1 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={isTruper || isKamasa ? "default" : "outline"}
                                                                className={`text-[10px] uppercase font-bold tracking-wider 
                                                            ${isTruper ? 'bg-orange-600 hover:bg-orange-700 text-white border-none' :
                                                                        isKamasa ? 'bg-yellow-500 hover:bg-yellow-600 text-black border-none' : ''}
                                                        `}
                                                            >
                                                                {result.source.replace('-Catalogo', '')}
                                                            </Badge>
                                                            {result.similarity_score > 0.5 && (
                                                                <Badge className={`text-[10px] border-none ${isTruper || isKamasa
                                                                    ? 'bg-white/80 text-black hover:bg-white'
                                                                    : 'bg-green-100 text-green-700 hover:bg-green-100'
                                                                    }`}>
                                                                    Relevante
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <h4 className="text-sm font-medium line-clamp-2" title={result.title}>{result.title}</h4>
                                                        {(isTruper || isKamasa) && (
                                                            <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                                                <CheckCircle className="h-3 w-3" /> Resultado directo de catálogo
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-4 min-w-fit">
                                                        <div className="text-right">
                                                            {isTruper && result.price === 'Ver Catálogo' ? (
                                                                <div className="text-sm font-bold text-orange-700 dark:text-orange-400">Ver Catálogo</div>
                                                            ) : (
                                                                <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{result.price}</div>
                                                            )}
                                                            <div className="text-[10px] text-muted-foreground">Precio Público</div>
                                                        </div>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => window.open(result.link, '_blank')}>
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {isScanning && (
                                            <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground animate-pulse">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Buscando más resultados en la web...
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                                        <Search className="h-12 w-12 text-slate-200 mb-3" />
                                        <h3 className="text-lg font-medium text-slate-900">No se encontraron productos</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs mb-4">
                                            No encontramos coincidencias para "{verifyingProduct?.description}" con los filtros actuales.
                                        </p>
                                        <Button variant="outline" onClick={handleRetry}>
                                            Intentar con otras palabras clave
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="flex-1 overflow-y-auto p-4 mt-0 bg-slate-50/30 dark:bg-slate-900/30">
                            {loadingHistory ? (
                                <div className="flex items-center justify-center p-12 h-full">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                                        <p className="text-sm text-muted-foreground">Buscando historial...</p>
                                    </div>
                                </div>
                            ) : salesHistory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground h-full">
                                    <Search className="h-10 w-10 mb-3 opacity-20" />
                                    <p>No se encontró historial de compras para el código</p>
                                    <span className="font-mono font-medium text-foreground mt-1 bg-slate-100 px-2 py-0.5 rounded text-xs dark:bg-slate-800">{verifyingProduct?.code}</span>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h4 className="font-medium text-sm">Historial de Ventas Públicas</h4>
                                            <p className="text-xs text-muted-foreground">Adjudicaciones registradas en Open Data</p>
                                        </div>
                                        <Badge variant="outline" className="bg-white dark:bg-slate-950">{salesHistory.length} registros</Badge>
                                    </div>
                                    <div className="border rounded-lg overflow-hidden bg-white dark:bg-slate-950">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-50">
                                                    <TableHead className="w-[100px]">Fecha</TableHead>
                                                    <TableHead>Entidad</TableHead>
                                                    <TableHead className="text-right">Precio Unit.</TableHead>
                                                    <TableHead className="text-right">Cant.</TableHead>
                                                    <TableHead className="text-right">OC</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {salesHistory.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="text-xs py-2 text-muted-foreground">{item.fecha}</TableCell>
                                                        <TableCell className="text-xs py-2 font-medium max-w-[200px]" title={item.entidad}>
                                                            <div className="truncate">{item.entidad}</div>
                                                        </TableCell>
                                                        <TableCell className="text-xs py-2 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                                                            S/ {item.precio_unitario.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-xs py-2 text-right text-muted-foreground">{item.cantidad}</TableCell>
                                                        <TableCell className="text-xs py-2 text-right font-mono text-indigo-600 dark:text-indigo-400">
                                                            {item.orden_compra}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* Group Details Modal */}
            <Dialog open={!!viewingGroup} onOpenChange={(open) => !open && setViewingGroup(null)}>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Detalle del Grupo de Similitud</DialogTitle>
                        <DialogDescription>
                            Visualizando {viewingGroup?.products.length} productos agrupados por características idénticas.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                        {/* 1. System Product Comparison (Review Card) */}
                        {viewingGroup?.systemProduct && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    Producto Comparativo en Base de Datos
                                </h3>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-lg">{viewingGroup.systemProduct.brandName}</span>
                                            <Badge className={`h-6 ${viewingGroup.systemProduct.similarityScore > 0.7 ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                                {(viewingGroup.systemProduct.similarityScore * 100).toFixed(0)}% Coincidencia Promedio
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground p-3 bg-white dark:bg-black/20 rounded border">
                                            {viewingGroup.systemProduct.description}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs font-mono">
                                            <span className="text-muted-foreground">Internal Code:</span>
                                            <span className="bg-slate-200 px-2 py-0.5 rounded">{viewingGroup.systemProduct.code}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. List of Market Products in Group */}
                        <div>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Eye className="h-4 w-4 text-indigo-600" />
                                Productos en este Grupo ({viewingGroup?.products.length})
                            </h3>
                            <div className="space-y-3">
                                {viewingGroup?.products.map((prod, idx) => (
                                    <div key={idx} className={`flex flex-col md:flex-row gap-4 p-3 border rounded-lg transition-colors relative overflow-hidden
                                        ${(prod.salesCount || 0) > 0
                                            ? "bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 dark:from-emerald-950/30 dark:via-green-900/20 dark:to-emerald-950/30 border-emerald-500 shadow-sm"
                                            : "bg-white dark:bg-background hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                        }
                                    `}>
                                        {(prod.salesCount || 0) > 0 && <WinnerStars />}
                                        <div className="flex-1 relative z-10">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-sm">{prod.brandName}</span>
                                                {(prod.salesCount || 0) > 0 && (
                                                    <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 gap-1" title={`${prod.salesCount} Ventas`}>
                                                        <TrendingUp className="h-3 w-3" />
                                                        {prod.salesCount}
                                                    </Badge>
                                                )}
                                                <Badge variant="secondary" className="text-[10px]">{prod.status}</Badge>
                                                {prod.statusInSystem === 'found' && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px]">Existe</Badge>}
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">{prod.description}</p>
                                            <div className="text-[10px] text-slate-400 font-mono mt-1">{prod.code}</div>
                                        </div>

                                        {/* Action Buttons for Individual Items in Group */}
                                        <div className="flex items-center gap-2 min-w-fit">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 text-xs gap-2"
                                                onClick={() => {
                                                    handleScanClick(prod);
                                                }}
                                            >
                                                <Search className="h-3 w-3" /> Escanear
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
