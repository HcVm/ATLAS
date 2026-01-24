import { OpenDataEntryTest } from "./types"

// Helper to safely get nested properties
const get = (obj: any, path: string, defaultValue: any = undefined) => {
    const travel = (regexp: RegExp) =>
        String.prototype.split
            .call(path, regexp)
            .filter(Boolean)
            .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
    const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
    return result === undefined || result === null ? defaultValue : result;
};

// Helper to find party name by ID in the parties array
const resolvePartyName = (parties: any[], id: string, role: string) => {
    if (!parties || !id) return "DESCONOCIDO";
    // Clean ID for matching (remove prefixes like PE-RUC-)
    const cleanId = id.replace("PE-RUC-", "");

    // Find matching party
    const party = parties.find(p => {
        const pId = get(p, "id", "").replace("PE-RUC-", "");
        return pId === cleanId;
        // Optional: check roles if needed, but ID match is usually sufficient in standard valid OCDS
    });

    return get(party, "name", "DESCONOCIDO");
}

export function transformOCDSToEntry(release: any): OpenDataEntryTest | null {
    try {
        const tender = release.tender || {};

        // 1. Strict Filter: We ONLY want "Catálogos Electrónicos" or "Acuerdos Marco"
        // Check procurementMethodDetails (e.g., "Contratación Directa", "Subasta Inversa", "Catálogos Electrónicos")
        const methodDetails = (tender.procurementMethodDetails || "").toUpperCase();
        const method = (tender.procurementMethod || "").toUpperCase();

        // Keywords that indicate this is likely what the user wants
        const isCatalog =
            methodDetails.includes("CATÁLOGO") ||
            methodDetails.includes("CATALOGO") ||
            methodDetails.includes("ACUERDO MARCO") ||
            methodDetails.includes("CONVENIO MARCO");

        // If it's not a catalog order, skip it (return null)
        // NOTE: For debugging today, we will log what we skipped to helps us tune, but strictly return null.
        if (!isCatalog) {
            // console.log(`Skipping: ${methodDetails} - ${tender.description}`);
            return null;
        }

        const ocid = release.ocid;
        if (!ocid) return null;

        // OCDS structure usually has arrays for awards and contracts.
        // We will take the first contract/award for simplicity, or flattened.
        // Peru Compras orders usually map 1 Release = 1 Order (Contract).

        const contract = get(release, "contracts.0", {});
        const award = get(release, "awards.0", {});
        const buyer = release.buyer || {};
        const supplierAward = get(award, "suppliers.0", {});
        const parties = release.parties || [];

        // Resolve Names using lookup
        const supplierId = get(supplierAward, "id", "");
        const buyerId = get(buyer, "id", "");

        const supplierName = resolvePartyName(parties, supplierId, "supplier");
        const buyerName = resolvePartyName(parties, buyerId, "buyer");

        // If there is no amount, it's not useful for analytics
        const amount = get(contract, "value.amount") || get(award, "value.amount") || 0;

        // Status mapping
        // OCDS 'active' -> 'FORMALIZADA'
        let estado = "FORMALIZADA"; // Default for Catalog Orders usually
        if (contract.status === "cancelled" || release.tag?.includes("tenderCancellation")) estado = "ANULADA";

        // Item details
        const item = get(tender, "items.0", {});

        return {
            codigo_acuerdo_marco: "OCDS-AUTO", // We might need to extract this from tags or classification
            ruc_proveedor: supplierId.replace("PE-RUC-", "").substring(0, 15), // OCDS often prefixes IDs
            razon_social_proveedor: supplierName.substring(0, 255),
            ruc_entidad: buyerId.replace("PE-RUC-", "").substring(0, 15),
            razon_social_entidad: buyerName.substring(0, 255),
            unidad_ejecutora: "", // Not always available in standard OCDS
            procedimiento: methodDetails.substring(0, 100),
            tipo_compra: "Catálogo Electrónico",
            orden_electronica: ocid.substring(0, 50),
            estado_orden_electronica: estado.substring(0, 50),
            total_entregas: 1, // Default
            nro_orden_fisica: get(contract, "id", "-").substring(0, 50),
            orden_digitalizada: release.uri || "",

            fecha_publicacion: release.date || new Date().toISOString(),
            fecha_aceptacion: get(contract, "dateSigned") || release.date,

            acuerdo_marco: (tender.title || "Acuerdo Marco").substring(0, 255),
            direccion_proveedor: "", // Not directly available in OCDS parties, needs more complex lookup

            // Catalog details might be deep in items
            catalogo: get(item, "classification.scheme", "Catálogo"),
            categoria: get(item, "classification.description", "General").substring(0, 255),

            descripcion_ficha_producto: get(item, "description", tender.description || "Sin descripción"),
            marca_ficha_producto: "",
            nro_parte: get(item, "classification.id", "").substring(0, 50),
            link_ficha_producto: "",

            nro_entrega: 1,
            fecha_inicio_entrega: get(contract, "period.startDate") || release.date,
            plazo_entrega: get(tender, "contractPeriod.durationInDays", 0), // Need calculation
            fecha_fin_entrega: get(contract, "period.endDate") || release.date,

            dep_entrega: get(tender, "deliveryAddresses.0.region", "") || get(buyer, "address.region", ""),
            prov_entrega: get(buyer, "address.locality", ""),
            dist_entrega: "",
            direccion_entrega: get(tender, "deliveryAddresses.0.streetAddress", ""),

            cantidad_entrega: get(item, "quantity", 1),
            precio_unitario: get(item, "unit.value.amount", 0), // Hard to infer from total sometimes
            sub_total: amount,
            igv_entrega: 0,
            monto_total_entrega: amount
        }

    } catch (e) {
        console.error("Error generating OCDS entry:", e);
        return null;
    }
}

export async function fetchOECEData(url: string): Promise<OpenDataEntryTest[]> {
    // 1. Fetch
    const res = await fetch(url, {
        headers: {
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (ATLAS Bot)",
        }
    })

    if (!res.ok) {
        // Try reading body for error detail
        const text = await res.text().catch(() => "")
        throw new Error(`OECE API Failed: ${res.status} ${res.statusText} - ${text.substring(0, 100)}`)
    }

    const json = await res.json()
    let releases: any[] = []

    // 2. Handle different response structures
    if (json.releases && Array.isArray(json.releases)) {
        // Standard OCDS Record Package or Release Package
        releases = json.releases
    } else if (json.results && Array.isArray(json.results)) {
        // Search Endpoint (usually returns lightweight objects that might need refetching, 
        // OR full objects depending on API version. We assume full for now or we map what is there)
        releases = json.results
    } else if (Array.isArray(json)) {
        // Direct array
        releases = json
    } else {
        console.warn("OECE Client: Unknown JSON structure", Object.keys(json))
        // Write to a debug file to inspect structure
        const fs = require('fs');
        try {
            fs.writeFileSync('tmp_oece_debug.json', JSON.stringify(json, null, 2));
            console.log("Debug: Saved response to tmp_oece_debug.json");
        } catch (e) { }
    }

    console.log(`OECE Client: Found ${releases.length} items in response.`)

    // 3. Transformation
    // Note: Search results might have slightly different keys (e.g. 'compiledRelease' instead of root properties)
    const mapped = releases.map(item => {
        // If it's a search result, the real data might be in 'compiledRelease' or just flat properties matching OCDS
        const realItem = item.compiledRelease || item;
        return transformOCDSToEntry(realItem)
    }).filter(Boolean) as OpenDataEntryTest[]

    return mapped
}
