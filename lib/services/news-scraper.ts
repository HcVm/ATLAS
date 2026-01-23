
import type { Browser } from "puppeteer-core"

export interface ScrapedNewsItem {
    title: string
    url: string
    date?: string
    imageUrl?: string
    content?: string
}

export async function scrapePeruComprasNews(): Promise<ScrapedNewsItem[]> {
    let browser: Browser | null = null
    try {
        if (process.env.NODE_ENV === "production") {
            const chromium = await import("@sparticuz/chromium").then(mod => mod.default)
            const puppeteerCore = await import("puppeteer-core").then(mod => mod.default)

            browser = await puppeteerCore.launch({
                args: [...(chromium as any).args, "--hide-scrollbars", "--disable-web-security"],
                defaultViewport: (chromium as any).defaultViewport,
                executablePath: await (chromium as any).executablePath(),
                headless: (chromium as any).headless,
                ignoreHTTPSErrors: true,
            }) as unknown as Browser
        } else {
            const puppeteer = await import("puppeteer").then(mod => mod.default)
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }) as unknown as Browser
        }

        const page = await browser.newPage()
        // Optimizations to load faster - block heavy assets
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // 1. Get List of News
        // Increased timeout for safety in serverless
        await page.goto("https://www.gob.pe/institucion/perucompras/noticias", { waitUntil: "domcontentloaded", timeout: 45000 })

        const links = await page.evaluate(() => {
            const items: { title: string, url: string, imageUrl?: string }[] = []

            // Selector specific to Gob.pe standard news lists
            const anchors = Array.from(document.querySelectorAll('a[href*="/institucion/perucompras/noticias/"]'))

            anchors.forEach((a) => {
                const title = a.textContent?.trim() || ""
                const url = (a as HTMLAnchorElement).href

                if (title.length < 15) return // Skip breadcrumbs/nav links
                if (items.some(i => i.url === url)) return // Skip duplicates

                // Try to find image in container
                let container = a.closest('li') || a.closest('.card') || a.closest('div.grid-item') || a.parentElement?.parentElement
                let imageUrl = undefined
                if (container) {
                    const img = container.querySelector('img')
                    if (img && img.src) imageUrl = img.src
                }

                items.push({ title, url, imageUrl })
            })

            return items
        })

        // 2. Visit Top Items to get Details (Content / Date)
        // Limit to top 5 to avoid timeouts/bans
        const detailedItems: ScrapedNewsItem[] = []
        const limit = 5

        for (let i = 0; i < Math.min(links.length, limit); i++) {
            const item = links[i]
            try {
                // Navigate to detail page
                await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 20000 })

                const details = await page.evaluate(() => {
                    let content = ""

                    // Strategy: Get all paragraphs from main content area
                    // 1. Try to find the specific container usually used in gob.pe
                    // The browser inspection confirms '.description' contains the full text
                    const descriptionContainer = document.querySelector('.description');
                    const pageContentContainer = document.querySelector('.page-content');
                    const bodyContainer = document.querySelector('.institution-news-body');

                    const container = descriptionContainer || pageContentContainer || bodyContainer;

                    if (container) {
                        content = Array.from(container.querySelectorAll('p'))
                            .map(p => p.textContent?.trim() || "")
                            .filter(t => t.length > 20 && !t.includes("Esta noticia pertenece al compendio"))
                            .join('\n\n');
                    }

                    // 2. If no specific container found, fall back to all P in main
                    if (!content) {
                        const main = document.querySelector('main');
                        if (main) {
                            content = Array.from(main.querySelectorAll('p'))
                                .map(p => p.textContent?.trim() || "")
                                .filter(t => t.length > 30 && !t.includes("Esta noticia pertenece al compendio"))
                                .join('\n\n');
                        }
                    }

                    // 3. Fallback to meta description ONLY if content is very short/empty
                    if (!content || content.length < 50) {
                        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content')
                        if (metaDesc) content = metaDesc
                    }

                    return { content }
                })

                detailedItems.push({
                    ...item,
                    content: details.content || `Noticia: ${item.title}`
                })

            } catch (err) {
                console.error(`Error scraping details for ${item.url}:`, err)
                // If detail scrape fails, push basic item
                detailedItems.push({ ...item, content: item.title })
            }
        }

        return detailedItems
    } catch (error) {
        console.error("Scraping error:", error)
        return []
    } finally {
        if (browser) await browser.close()
    }
}
