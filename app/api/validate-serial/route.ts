import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const serialNumber = searchParams.get("serial")

  if (!serialNumber) {
    return NextResponse.json({ error: "Serial number is required" }, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const { data: serialData, error } = await supabase
    .from("product_serials")
    .select(`
      *,
      products:product_id (
        brands (
          name
        )
      ),
      product_lots:lot_id (
        status,
        delivery_date
      ),
      sales:sale_id (
        delivery_start_date,
        delivery_end_date,
        sale_date
      )
    `)
    .eq("serial_number", serialNumber)
    .single()

  if (error || !serialData) {
    return NextResponse.json({
      isValid: false,
      message: "Número de serie no encontrado en nuestro sistema",
    })
  }

  const brandName = (serialData.products as any)?.brands?.name || null

  const lot = serialData.product_lots as any
  const sale = serialData.sales as any

  // Determinar si fue entregado basándose en el estado del lote
  const isDeliveredByLot = lot?.status === "delivered" || lot?.status === "sold"
  const deliveryDate = lot?.delivery_date || sale?.delivery_end_date || sale?.delivery_start_date || sale?.sale_date

  if (!isDeliveredByLot || !deliveryDate) {
    return NextResponse.json({
      isValid: true,
      isDelivered: false,
      message: "Producto registrado pero aún no entregado",
      serialNumber: serialData.serial_number,
      productName: serialData.product_name,
      productCode: serialData.product_code,
      brandName,
    })
  }

  const deliveryDateObj = new Date(deliveryDate)
  const warrantyExpirationDate = new Date(deliveryDateObj)
  warrantyExpirationDate.setMonth(warrantyExpirationDate.getMonth() + 12)

  const today = new Date()
  const isWarrantyActive = today < warrantyExpirationDate

  const remainingDays = Math.ceil((warrantyExpirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const remainingMonths = Math.floor(remainingDays / 30)

  return NextResponse.json({
    isValid: true,
    isDelivered: true,
    serialNumber: serialData.serial_number,
    productName: serialData.product_name,
    productCode: serialData.product_code,
    brandName,
    deliveryDate: deliveryDate,
    warrantyExpirationDate: warrantyExpirationDate.toISOString(),
    isWarrantyActive,
    remainingDays: isWarrantyActive ? remainingDays : 0,
    remainingMonths: isWarrantyActive ? remainingMonths : 0,
    message: isWarrantyActive
      ? `Garantía activa - ${remainingMonths} ${remainingMonths === 1 ? "mes" : "meses"} restantes`
      : "Garantía expirada",
  })
}
