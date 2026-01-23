
import { type NextRequest, NextResponse } from "next/server"
import { scrapePeruComprasNews } from "@/lib/services/news-scraper"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export const maxDuration = 60 // 5 minutes typically allowed on Vercel Pro, but safe 60s for Hobby

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) {
                        return cookieStore.get(name)?.value
                    },
                    set(name: string, value: string, options: any) {
                        cookieStore.set({ name, value, ...options })
                    },
                    remove(name: string, options: any) {
                        cookieStore.set({ name, value: "", ...options })
                    },
                },
            },
        )

        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Check role
        const { data: userProfile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()

        if (userProfile?.role !== "admin" && userProfile?.role !== "supervisor") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // 1. Scrape News
        const newsItems = await scrapePeruComprasNews()
        console.log(`Scraped ${newsItems.length} items`)

        if (newsItems.length === 0) {
            return NextResponse.json({ message: "No news found or scraping failed", inserted: 0 })
        }

        // 2. Get All Companies
        const { data: companies } = await supabase.from("companies").select("id")
        if (!companies || companies.length === 0) {
            return NextResponse.json({ message: "No companies found", inserted: 0 })
        }

        let insertedCount = 0

        // 3. Process Items
        for (const item of newsItems) {
            // We want to add this news item for EVERY company, but only if it doesn't exist yet

            for (const company of companies) {
                // Check existence
                const { data: existing } = await supabase
                    .from("news")
                    .select("id")
                    .eq("title", item.title)
                    .eq("company_id", company.id)
                    .maybeSingle()

                if (!existing) {
                    // Insert
                    const { error } = await supabase.from("news").insert({
                        title: item.title,
                        content: `${item.content}\n\nLeer completa en: ${item.url}`,
                        image_url: item.imageUrl,
                        created_by: user.id,
                        published: true,
                        company_id: company.id
                    })

                    if (!error) insertedCount++
                    else console.error("Error inserting news:", error)
                }
            }
        }

        // 4. Cleanup: Keep only latest 5 news per company
        let deletedCount = 0
        for (const company of companies) {
            const { data: allNews } = await supabase
                .from("news")
                .select("id")
                .eq("company_id", company.id)
                .order("created_at", { ascending: false })

            if (allNews && allNews.length > 5) {
                const newsToDelete = allNews.slice(5)
                const idsToDelete = newsToDelete.map(n => n.id)

                if (idsToDelete.length > 0) {
                    const { error: deleteError } = await supabase
                        .from("news")
                        .delete()
                        .in("id", idsToDelete)

                    if (!deleteError) {
                        deletedCount += idsToDelete.length
                    } else {
                        console.error(`Error cleaning up news for company ${company.id}:`, deleteError)
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Sync complete. Found ${newsItems.length} items. Created ${insertedCount} new records. Cleaned up ${deletedCount} old records across ${companies.length} companies.`
        })

    } catch (error: any) {
        console.error("API Error:", error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
