"use client"

import { useEffect, useRef } from "react"
import { Lock } from "lucide-react"

interface SecurePdfViewerProps {
  pdfUrl: string
  title: string
}

export function SecurePdfViewer({ pdfUrl, title }: SecurePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    // Prevenir descargas y acciones no deseadas
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      return false
    }

    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Prevenir Ctrl+S, Ctrl+P, etc.
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "p" || e.key === "P")) {
        e.preventDefault()
        return false
      }
    }

    // Aplicar a la ventana principal
    window.addEventListener("contextmenu", preventContextMenu)
    window.addEventListener("keydown", preventKeyboardShortcuts)

    // Aplicar al iframe cuando esté disponible
    if (iframeRef.current) {
      try {
        const iframeDoc =
          iframeRef.current.contentDocument ||
          (iframeRef.current.contentWindow && iframeRef.current.contentWindow.document)

        if (iframeDoc) {
          iframeDoc.addEventListener("contextmenu", preventContextMenu)
          iframeDoc.addEventListener("keydown", preventKeyboardShortcuts)
        }
      } catch (e) {
        console.log("No se pudo acceder al contenido del iframe debido a políticas de seguridad")
      }
    }

    return () => {
      // Limpiar event listeners
      window.removeEventListener("contextmenu", preventContextMenu)
      window.removeEventListener("keydown", preventKeyboardShortcuts)
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {/* Marca de agua diagonal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="text-gray-300 text-6xl font-bold transform rotate-[-45deg] opacity-20">VISTA PREVIA</div>
      </div>

      {/* Iframe con el PDF */}
      <iframe
        ref={iframeRef}
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
        className="w-full h-full border-0"
        title={`Vista previa de ${title}`}
        sandbox="allow-scripts allow-same-origin"
      />

      {/* Aviso de seguridad */}
      <div className="absolute bottom-0 left-0 right-0 bg-amber-50 border-t border-amber-200 p-2 text-center text-sm text-amber-800">
        <div className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          <span>
            Para descargar este documento con marca de agua y seguimiento, utilice el botón "Descargar Documento"
          </span>
        </div>
      </div>
    </div>
  )
}
