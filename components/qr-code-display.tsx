"use client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface QRDisplayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  qrData: string
  title: string
  description?: string
}

export function QRDisplayDialog({ open, onOpenChange, qrData, title, description }: QRDisplayDialogProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)

  useEffect(() => {
    const fetchQrCode = async () => {
      if (!qrData || !open) {
        setQrImageUrl(null)
        return
      }

      setLoadingQr(true)
      try {
        const response = await fetch(`/api/generate-qr?data=${encodeURIComponent(qrData)}`)
        if (!response.ok) {
          throw new Error("Failed to fetch QR code image")
        }
        const { qrDataUrl } = await response.json()
        setQrImageUrl(qrDataUrl)
      } catch (error) {
        console.error("Error fetching QR code:", error)
        toast.error("Error al generar el código QR.")
        setQrImageUrl(null)
      } finally {
        setLoadingQr(false)
      }
    }

    fetchQrCode()
  }, [qrData, open])

  const downloadQRCode = () => {
    if (qrImageUrl) {
      const downloadLink = document.createElement("a")
      downloadLink.href = qrImageUrl
      downloadLink.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_qr_code.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    } else {
      toast.error("No hay imagen QR para descargar.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] text-center">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex justify-center p-4">
          {loadingQr ? (
            <div className="h-64 w-64 bg-muted flex items-center justify-center rounded-md">
              <p className="text-muted-foreground">Generando QR...</p>
            </div>
          ) : qrImageUrl ? (
            <img src={qrImageUrl || "/placeholder.svg"} alt="QR Code" className="w-64 h-64 object-contain" />
          ) : (
            <div className="h-64 w-64 bg-muted flex items-center justify-center rounded-md">
              <p className="text-muted-foreground">No hay datos para el QR</p>
            </div>
          )}
        </div>
        {qrImageUrl && (
          <Button onClick={downloadQRCode} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Descargar QR
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
