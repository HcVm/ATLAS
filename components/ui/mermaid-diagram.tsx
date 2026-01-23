"use client"

import { useEffect, useRef } from "react"
import mermaid from "mermaid"
import { useTheme } from "next-themes"

export function MermaidDiagram({ chart }: { chart: string }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const { theme } = useTheme()

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        })

        if (containerRef.current) {
            mermaid.contentLoaded()
        }
    }, [theme])

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.innerHTML = ""
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

            const render = async () => {
                try {
                    const { svg } = await mermaid.render(id, chart)
                    if (containerRef.current) containerRef.current.innerHTML = svg
                } catch (error) {
                    console.error("Mermaid Failed to render", error);
                    if (containerRef.current) containerRef.current.innerHTML = "<div class='text-red-500 text-xs p-2'>Error renderizando diagrama</div>"
                }
            }
            render()
        }
    }, [chart, theme])

    return <div ref={containerRef} className="w-full flex justify-center py-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-x-auto" />
}
