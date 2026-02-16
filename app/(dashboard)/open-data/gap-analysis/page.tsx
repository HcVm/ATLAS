'use client';

import React, { useState } from 'react';
import { Upload, FileSpreadsheet, Search, CheckCircle, AlertTriangle, XCircle, Info, ExternalLink, Loader2, Eye, DollarSign } from 'lucide-react';
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
import { analyzeProductGap, AnalysisResult, MarketProductDetail, verifyProductOnWeb, ScrapedProduct } from './actions';

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

        try {
            // Pass the base query and extra keywords
            const results = await verifyProductOnWeb(verifyingProduct, extraKeywords, baseQuery);
            setScanResults(results);
        } catch (error) {
            toast.error('Error al conectar con el servicio de scraping');
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
            <ScrollArea className="h-[600px] w-full border rounded-md">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10">
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
                                    <TableRow className={`${isInGroup ? "bg-indigo-50/30 hover:bg-indigo-50/50 dark:bg-indigo-950/10 dark:hover:bg-indigo-950/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-900/50"} transition-colors`}>
                                        <TableCell className="align-top relative">
                                            {isInGroup && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-300 dark:bg-indigo-700" />
                                            )}
                                            <div className="font-medium text-sm pl-2">{product.brandName}</div>
                                            {product.isSystemBrand && (
                                                <Badge variant="outline" className="text-[10px] mt-1 ml-2 border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/20">Tu Marca</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="align-top font-mono text-xs text-muted-foreground">
                                            {product.code}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <div className="text-sm line-clamp-3" title={product.description}>
                                                {product.description}
                                            </div>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                                                {product.status || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            {product.statusInSystem === 'found' ? (
                                                <div className="flex items-center text-green-600 font-medium text-xs bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full w-fit">
                                                    <CheckCircle className="h-3 w-3 mr-1" /> Existe
                                                </div>
                                            ) : product.statusInSystem === 'missing' ? (
                                                <div className="flex items-center text-red-600 font-medium text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full w-fit">
                                                    <XCircle className="h-3 w-3 mr-1" /> Faltante
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic px-2">Competencia</span>
                                            )}
                                        </TableCell>
                                        {!hideSimilarity && (
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
                                        )}
                                    </TableRow>
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </ScrollArea>

            <Dialog open={!!verifyingProduct} onOpenChange={(open) => !open && setVerifyingProduct(null)}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Verificación de Mercado</DialogTitle>
                        <DialogDescription>
                            Buscando coincidencias para: <span className="font-semibold text-foreground">{verifyingProduct?.description}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
                        {!hasStartedScan ? (
                            // INPUT FORM VIEW
                            <div className="flex flex-col gap-6 py-6 px-4">
                                {/* Base Search Query Selection */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold text-foreground">
                                        Término Base de Búsqueda
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Selecciona qué tan específica quieres que sea la búsqueda inicial en Google.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {queryOptions.map((opt, i) => (
                                            <Button
                                                key={i}
                                                variant={!useCustomQuery && selectedQuery === opt ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => { setSelectedQuery(opt); setUseCustomQuery(false); }}
                                                className="text-xs h-8"
                                            >
                                                {opt}
                                            </Button>
                                        ))}
                                        <Button
                                            variant={useCustomQuery ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setUseCustomQuery(true)}
                                            className="text-xs h-8"
                                        >
                                            Personalizado
                                        </Button>
                                    </div>

                                    {useCustomQuery && (
                                        <Input
                                            value={customQuery}
                                            onChange={(e) => setCustomQuery(e.target.value)}
                                            placeholder="Escribe tu término base..."
                                            className="h-9 text-sm"
                                        />
                                    )}
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
                        ) : isScanning ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
                                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
                                <p className="text-sm text-muted-foreground animate-pulse">
                                    Buscando "{extraKeywords}" en Sodimac, Promart y MercadoLibre...
                                </p>
                            </div>
                        ) : scanResults.length > 0 ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resultados Encontrados ({scanResults.length})</div>
                                    <Button variant="ghost" size="sm" onClick={handleRetry} className="h-6 text-xs text-indigo-600 hover:bg-indigo-50">
                                        Modificar Búsqueda
                                    </Button>
                                </div>
                                {scanResults.map((result, i) => (
                                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-900/30 transition-colors gap-3">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{result.source}</Badge>
                                                {result.similarity_score > 0.5 && (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 text-[10px]">Relevante</Badge>
                                                )}
                                            </div>
                                            <h4 className="text-sm font-medium line-clamp-2" title={result.title}>{result.title}</h4>
                                        </div>
                                        <div className="flex items-center gap-4 min-w-fit">
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-slate-700 dark:text-slate-200">{result.price}</div>
                                                <div className="text-[10px] text-muted-foreground">Precio Público</div>
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => window.open(result.link, '_blank')}>
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
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
                                    <div key={idx} className="flex flex-col md:flex-row gap-4 p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors bg-white dark:bg-background">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-sm">{prod.brandName}</span>
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
                                                    // Close group modal to open scan modal? 
                                                    // OR keep group modal open? 
                                                    // Simplest: Close group modal, open scan modal.
                                                    setViewingGroup(null);
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
