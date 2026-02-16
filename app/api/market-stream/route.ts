import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Remove trailing slash if present
        const rawUrl = process.env.SCRAPER_URL || 'http://127.0.0.1:8000';
        const scraperUrl = rawUrl.replace(/\/$/, '');

        console.log(`Open-Data Proxy: Streaming from ${scraperUrl}/stream-market`);

        const response = await fetch(`${scraperUrl}/stream-market`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            console.error("Scraper Stream Error:", response.status, response.statusText);
            return NextResponse.json({ error: 'Scraper Error' }, { status: response.status });
        }

        // Return the stream directly to the client
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error("Stream Proxy Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
