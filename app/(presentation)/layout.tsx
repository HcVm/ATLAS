import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export default function PresentationLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <div className="min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
                        {children}
                    </div>
                </ThemeProvider>
            </body>
        </html>
    )
}
