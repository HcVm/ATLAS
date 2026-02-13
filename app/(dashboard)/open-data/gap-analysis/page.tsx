'use client';

import { useState } from 'react';
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
                        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                            <TabsTrigger value="all">Análisis Completo</TabsTrigger>
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

function ProductTable({ products, hideSimilarity = false }: { products: MarketProductDetail[], hideSimilarity?: boolean }) {
    const [verifyingProduct, setVerifyingProduct] = useState<MarketProductDetail | null>(null);
    const [scanResults, setScanResults] = useState<ScrapedProduct[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    // New States for "Pre-Scan" Input
    const [extraKeywords, setExtraKeywords] = useState("");
    const [hasStartedScan, setHasStartedScan] = useState(false);

    const handleScanClick = (product: MarketProductDetail) => {
        setVerifyingProduct(product);
        setExtraKeywords(""); // Reset
        setHasStartedScan(false); // Reset to show Input form first
        setScanResults([]);
    };

    const executeScan = async () => {
        if (!verifyingProduct) return;

        setIsScanning(true);
        setHasStartedScan(true);
        setScanResults([]);

        try {
            // Pass the extra keywords to the server action
            const results = await verifyProductOnWeb(verifyingProduct, extraKeywords);
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
                        {products.map((product, idx) => (
                            <TableRow key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                <TableCell className="align-top">
                                    <div className="font-medium text-sm">{product.brandName}</div>
                                    {product.isSystemBrand && (
                                        <Badge variant="outline" className="text-[10px] mt-1 border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/20">Tu Marca</Badge>
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
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
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
                                <div className="space-y-2">
                                    <Label htmlFor="extra-keywords" className="text-sm font-semibold text-foreground">
                                        Palabras Clave Adicionales (Opcional)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Ingrese características únicas (ej: "14 dientes", "3kg", "Inalámbrico") para filtrar mejor los resultados.
                                    </p>
                                    <Input
                                        id="extra-keywords"
                                        placeholder="Ej: 14 Dientes"
                                        value={extraKeywords}
                                        onChange={(e) => setExtraKeywords(e.target.value)}
                                        className="h-10 text-base"
                                        onKeyDown={(e) => e.key === 'Enter' && executeScan()}
                                        autoFocus
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
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
        </>
    );
}
