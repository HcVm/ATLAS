export interface PeruComprasOrder {
    orden_electronica: string;
    fecha_formalizacion: string; // "DD/MM/YYYY" or ISO
    monto_total: string | number;
    ruc_proveedor: string;
    razon_social_proveedor: string;
    ruc_entidad: string;
    razon_social_entidad: string;
    estado: string;
    // Add other likely fields from the Excel/JSON
    descripcion_producto?: string;
    cantidad?: number;
    precio_unitario?: number;
}

export interface OpenDataEntryTest {
    id?: string;
    codigo_acuerdo_marco: string;
    ruc_proveedor: string;
    razon_social_proveedor: string;
    ruc_entidad: string;
    razon_social_entidad: string;
    unidad_ejecutora: string;
    procedimiento: string;
    tipo_compra: string;
    orden_electronica: string;
    estado_orden_electronica: string;
    total_entregas: number;
    nro_orden_fisica: string;
    orden_digitalizada?: string;
    fecha_publicacion: string; // Date
    fecha_aceptacion: string; // Date
    acuerdo_marco: string;
    direccion_proveedor?: string;
    catalogo: string;
    categoria: string;
    descripcion_ficha_producto?: string;
    marca_ficha_producto?: string;
    nro_parte?: string;
    link_ficha_producto?: string;
    nro_entrega: number;
    fecha_inicio_entrega: string; // Date
    plazo_entrega: number;
    fecha_fin_entrega: string; // Date
    dep_entrega: string;
    prov_entrega: string;
    dist_entrega: string;
    direccion_entrega?: string;
    cantidad_entrega: number;
    precio_unitario: number;
    sub_total: number;
    igv_entrega: number;
    monto_total_entrega: number;
}
