import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { generateWithPrompt } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { bookId, type, count, difficulty } = await req.json();
    if (!bookId) return NextResponse.json({ error: 'ID buku wajib diisi' }, { status: 400 });

    const book = await db.book.findUnique({ where: { id: bookId } });
    if (!book) return NextResponse.json({ error: 'Buku tidak ditemukan' }, { status: 404 });

    const documents = await db.document.findMany({ where: { bookId }, orderBy: { page: 'asc' } });
    const fullText = documents.map(d => d.content).join('\n\n').slice(0, 6000);

    const quiz = await generateWithPrompt(
      `Kamu adalah pembuat soal latihan. Buat ${count || 5} soal ${type === 'essay' ? 'esai' : 'pilihan ganda'} ${difficulty === 'hard' ? 'sulit' : difficulty === 'medium' ? 'sedang' : 'mudah'} dari konten berikut. Untuk pilihan ganda, berikan 4 opsi (A-D) dan kunci jawaban. Jawab dalam bahasa Indonesia. Format: JSON array {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": "...", "explanation": "..."}]}`,
      `Judul: ${book.title}\n\nKonten:\n${fullText}`
    );

    await db.activity.create({
      data: { type: 'quiz', title: `Soal dari buku: ${book.title}`, userId: user.id }
    });

    return NextResponse.json({ quiz, bookTitle: book.title });
  } catch (error) {
    console.error('Quiz error:', error);
    return NextResponse.json({ error: 'Gagal membuat soal: ' + (error instanceof Error ? error.message : 'Unknown error') }, { status: 500 });
  }
}