// app/api/open-data/upload-url/route.ts
// Alternative client-side upload endpoint using handleUpload(). Use this if you want to switch back to client-side.

import { handleUpload, type HandleUploadBody } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: Use edge runtime for faster performance

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    // Verify token
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Token de Blob no configurado' }, { status: 500 });
    }

    const blob = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
        // Add auth if needed (e.g., check user session)
        // Example: const { user } = await getSession(); if (!user) throw new Error('Unauthorized');

        const allowedTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/csv',
        ];

        return {
          addRandomSuffix: true,
          allowedContentTypes: allowedTypes,
          maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
          tokenPayload: JSON.stringify({ /* optional metadata */ }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed:', blob.url);
        // Optional: Trigger processing or log
      },
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error in handleUpload:', error);
    return NextResponse.json(
      { error: (error as { message: string }).message },
      { status: 400 },
    );
  }
}