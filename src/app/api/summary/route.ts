import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { generateWithPrompt } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { bookId } = await req.json();
    if (!bookId) return NextResponse.json({ error: 'ID buku wajib diisi' }, { status: 400 });

    const book = await db.book.findUnique({ where: { id: bookId } });
    if (!book) return NextResponse.json({ error: 'Buku tidak ditemukan' }, { status: 404 });

    const documents = await db.document.findMany({ where: { bookId }, orderBy: { page: 'asc' } });
    const fullText = documents.map(d => d.content).join('\n\n').slice(0, 8000);

    const summary = await generateWithPrompt(
      'Kamu adalah asisten perpustakaan. Buat ringkasan komprehensif dari konten buku berikut. Sertakan poin-poin utama. Jawab dalam bahasa Indonesia.',
      `Judul: ${book.title}\n${book.author ? `Penulis: ${book.author}\n` : ''}\n\nKonten:\n${fullText}`
    );

    await db.activity.create({
      data: { type: 'summary', title: `Ringkasan buku: ${book.title}`, userId: user.id }
    });

    return NextResponse.json({ summary, bookTitle: book.title });
  } catch (error) {
    console.error('Summary error:', error);
    return NextResponse.json({ error: 'Gagal membuat ringkasan: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
}