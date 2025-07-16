"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProvider as ThemeProviderType } from "next-themes"
type ThemeProviderProps = React.ComponentProps<typeof ThemeProviderType>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
