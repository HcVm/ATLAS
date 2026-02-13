
"""
Simple Market Scraper
---------------------
This script uses 'playwright' (headless browser) to search for products on Peru's main e-commerce sites.
Sites: Sodimac, Promart, etc.

Usage:
  pip install playwright beautifulsoup4
  playwright install chromium
  python scraper.py "MARTILLO DE BOLA 16oz" 
"""

import sys
import asyncio
import json
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# List of sites to try searching on
# We use their internal search URLs
SITES = [
    {
        "name": "Sodimac",
        "search_url": "https://www.sodimac.com.pe/sodimac-pe/search?Ntt={query}",
        "selector": ".product-wrapper, .pod-item", # Generic class for product card
        "title_sel": ".product-title, .pod-title",
        "price_sel": ".price, .pod-price"
    },
    {
        "name": "Promart",
        "search_url": "https://www.promart.pe/search/?q={query}",
        "selector": ".product-item",
        "title_sel": ".product-name",
        "price_sel": ".best-price"
    }
]

async def scrape(product_name):
    results = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True) # Run headless for speed
        page = await browser.new_page()
        
        # User Agent to avoid bot detection
        await page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
        })

        for site in SITES:
            try:
                # 1. Clean query (remove brand if needed, or keep it)
                # For now, we search exactly what is passed
                url = site["search_url"].format(query=product_name.replace(" ", "%20"))
                print(f"Searching {site['name']}...", file=sys.stderr)
                
                await page.goto(url, timeout=15000, wait_until="domcontentloaded")
                
                # Wait for results or timeout
                try:
                    await page.wait_for_selector(site["selector"], timeout=5000)
                except:
                    print(f"No results or timeout on {site['name']}", file=sys.stderr)
                    continue

                # 2. Extract Data
                content = await page.content()
                soup = BeautifulSoup(content, 'html.parser')
                
                items = soup.select(site["selector"])[:3] # Get top 3 results
                
                for item in items:
                    title_el = item.select_one(site["title_sel"])
                    price_el = item.select_one(site["price_sel"])
                    
                    if title_el:
                        title = title_el.get_text(strip=True)
                        price = price_el.get_text(strip=True) if price_el else "N/A"
                        link = item.find("a")["href"] if item.find("a") else url
                        
                        # Calculate naive similarity (can be improved)
                        
                        results.append({
                            "source": site["name"],
                            "title": title,
                            "price": price,
                            "link": link if link.startswith("http") else f"https://www.{site['name'].lower()}.com.pe{link}"
                        })

            except Exception as e:
                print(f"Error on {site['name']}: {str(e)}", file=sys.stderr)

        await browser.close()
    
    return results

if __name__ == "__main__":
    query = sys.argv[1] if len(sys.argv) > 1 else "MARTILLO"
    data = asyncio.run(scrape(query))
    print(json.dumps(data, indent=2))
