import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { chunkText } from '@/lib/text-processing';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = (formData.get('title') as string) || file.name;
    const author = formData.get('author') as string | null;

    if (!file) return NextResponse.json({ error: 'File wajib diunggah' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${file.name}`;
    await fs.writeFile(path.join(uploadsDir, filename), buffer);

    let textContent = '';
    if (file.name.endsWith('.txt')) {
      textContent = buffer.toString('utf-8');
    } else if (file.name.endsWith('.md')) {
      textContent = buffer.toString('utf-8');
    } else if (file.name.endsWith('.json')) {
      try {
        const json = JSON.parse(buffer.toString('utf-8'));
        textContent = JSON.stringify(json, null, 2);
      } catch {
        textContent = buffer.toString('utf-8');
      }
    } else {
      textContent = `[Dokumen ${file.name}]
Ukuran file: ${buffer.length} bytes\nTipe: ${file.type || 'unknown'}\n\nFile ini telah diunggah dan diproses. Konten teks tidak dapat diekstrak secara otomatis dari format ini.`;
    }

    const book = await db.book.create({
      data: {
        title, author, filename, fileSize: buffer.length, fileType: file.name.split('.').pop() || 'unknown',
        totalPages: Math.max(1, Math.ceil(textContent.length / 2000)),
        status: 'ready', userId: user.id
      }
    });

    if (textContent.trim()) {
      const chunks = chunkText(textContent);
      await db.document.createMany({
        data: chunks.map((chunk, idx) => ({
          content: chunk.content, page: chunk.page, chunkIndex: idx, bookId: book.id
        }))
      });
    }

    await db.activity.create({
      data: { type: 'upload', title: `Mengunggah buku: ${title}`, userId: user.id }
    });

    return NextResponse.json({ id: book.id, title: book.title, status: book.status });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Gagal mengunggah buku' }, { status: 500 });
  }
}