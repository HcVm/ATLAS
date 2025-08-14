"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Bell, FileText, X, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface AssistantMessage {
  id: string
  text: string
  icon: React.ReactNode
  type: "notification" | "document" | "general"
}

const messages: AssistantMessage[] = [
  {
    id: "1",
    text: "¡Hola! Tienes 3 notificaciones pendientes por revisar",
    icon: <Bell className="h-4 w-4" />,
    type: "notification",
  },
  {
    id: "2",
    text: "Recuerda verificar los documentos de tu área",
    icon: <FileText className="h-4 w-4" />,
    type: "document",
  },
  {
    id: "3",
    text: "Hay documentos esperando tu aprobación",
    icon: <FileText className="h-4 w-4" />,
    type: "document",
  },
  {
    id: "4",
    text: "¿Necesitas ayuda navegando el sistema?",
    icon: <MessageCircle className="h-4 w-4" />,
    type: "general",
  },
]

export function VirtualAssistant() {
  const [isVisible, setIsVisible] = useState(false)
  const [currentMessage, setCurrentMessage] = useState(0)
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isMoving, setIsMoving] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  // Mostrar el asistente después de 2 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isDismissed) {
        setIsVisible(true)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [isDismissed])

  // Cambiar mensaje cada 8 segundos
  useEffect(() => {
    if (!isVisible || isDismissed) return

    const messageTimer = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length)
    }, 8000)

    return () => clearInterval(messageTimer)
  }, [isVisible, isDismissed])

  // Mover el asistente cada 15 segundos
  useEffect(() => {
    if (!isVisible || isDismissed) return

    const moveTimer = setInterval(() => {
      setIsMoving(true)

      // Posiciones predefinidas para que se mueva de forma natural
      const positions = [
        { x: 20, y: 20 },
        { x: window.innerWidth - 320, y: 20 },
        { x: window.innerWidth - 320, y: window.innerHeight - 200 },
        { x: 20, y: window.innerHeight - 200 },
        { x: window.innerWidth / 2 - 150, y: 20 },
      ]

      const randomPosition = positions[Math.floor(Math.random() * positions.length)]
      setPosition(randomPosition)

      // Terminar animación de movimiento
      setTimeout(() => setIsMoving(false), 1000)
    }, 15000)

    return () => clearInterval(moveTimer)
  }, [isVisible, isDismissed])

  // Auto-ocultar después de 2 minutos
  useEffect(() => {
    if (!isVisible) return

    const hideTimer = setTimeout(() => {
      setIsVisible(false)
    }, 120000) // 2 minutos

    return () => clearTimeout(hideTimer)
  }, [isVisible])

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
  }

  if (!isVisible || isDismissed) return null

  const currentMsg = messages[currentMessage]

  return (
    <div
      className={`fixed z-50 transition-all duration-1000 ease-in-out ${isMoving ? "scale-110" : "scale-100"}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: isMoving ? "rotate(2deg)" : "rotate(0deg)",
      }}
    >
      <Card className="w-80 p-4 bg-white/95 backdrop-blur-sm border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-start gap-3">
          {/* Avatar del asistente */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-md animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          </div>

          {/* Contenido del mensaje */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-1 text-blue-600">
                {currentMsg.icon}
                <span className="text-sm font-medium">Asistente SISDOC</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="ml-auto h-6 w-6 p-0 hover:bg-red-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">{currentMsg.text}</p>

            {/* Indicador de progreso */}
            <div className="flex gap-1 mt-3">
              {messages.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === currentMessage ? "w-6 bg-blue-500" : "w-2 bg-gray-300"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Efecto de brillo sutil */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-600/5 pointer-events-none" />
      </Card>

      {/* Sombra flotante */}
      <div className="absolute -bottom-2 left-4 right-4 h-2 bg-black/10 rounded-full blur-sm" />
    </div>
  )
}
