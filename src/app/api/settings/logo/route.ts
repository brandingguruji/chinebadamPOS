import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { verifyToken } from '@/lib/jwt';

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

async function requireAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return await verifyToken(authHeader.slice(7));
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const ext = MIME_TO_EXT[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: 'Unsupported format. Please upload PNG, JPG, WebP, or SVG.' },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Logo file must be under 2 MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Try saving into project folder public/uploads/store-logo.<ext>
    try {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });

      // Remove previous store-logo.* files to avoid stale files
      const existing = await fs.readdir(uploadsDir).catch(() => []);
      for (const fname of existing) {
        if (fname.startsWith('store-logo.')) {
          await fs.unlink(path.join(uploadsDir, fname)).catch(() => {});
        }
      }

      const fileName = `store-logo.${ext}`;
      await fs.writeFile(path.join(uploadsDir, fileName), buffer);

      const publicUrl = `/uploads/${fileName}?v=${Date.now()}`;
      return NextResponse.json({
        logo: publicUrl,
        savedToDisk: true,
        filePath: `public/uploads/${fileName}`,
      });
    } catch {
      // On Vercel serverless (read-only filesystem), fall back to Data URL stored in MongoDB
      const dataUrl = `data:${file.type};base64,${buffer.toString('base64')}`;
      return NextResponse.json({
        logo: dataUrl,
        savedToDisk: false,
      });
    }
  } catch (err) {
    console.error('Logo upload error:', err);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
