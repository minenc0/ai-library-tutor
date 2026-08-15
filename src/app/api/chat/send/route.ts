import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { chatCompletion } from '@/lib/ai';
import { keywordSearch } from '@/lib/text-processing';

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { chatId, message } = await req.json();
    if (!chatId || !message) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });

    await db.message.create({ data: { role: 'user', content: message, chatId } });

    const chat = await db.chat.findUnique({ where: { id: chatId }, include: { book: true } });

    let contextStr = '';
    let references: Array<{ bookTitle: string; page: number; content: string }> | null = null;

    const allDocs = await db.document.findMany({
      where: { book: { userId: user.id } },
      include: { book: { select: { title: true } } }
    });

    const docForSearch = allDocs.map(d => ({ content: d.content, page: d.page, bookTitle: d.book.title }));
    let searchDocs = docForSearch;

    if (chat?.bookId) {
      searchDocs = docForSearch.filter(d => d.bookTitle === chat.book?.title);
    }

    const relevant = keywordSearch(message, searchDocs.length > 0 ? searchDocs : docForSearch, 5);

    if (relevant.length > 0) {
      references = relevant.map(r => ({ bookTitle: r.bookTitle, page: r.page, content: r.content.slice(0, 500) }));
      contextStr = relevant.map(r => `[Dari buku "${r.bookTitle}" halaman ${r.page}]:
${r.content}`).join('\n\n');
    }

    let aiResponse: string;
    try {
      const systemMsg = contextStr
        ? `Kamu adalah asisten perpustakaan cerdas. Gunakan konteks buku berikut untuk menjawab pertanyaan. Jika kontensinya tidak cukup, jawab berdasarkan pengetahuan umum tapi sebutkan bahwa itu bukan dari buku.

Konteks buku:
${contextStr}`
        : 'Kamu adalah asisten perpustakaan cerdas. Jawab pertanyaan pengguna dengan bantuan pengetahuan umum. Sebutkan bahwa tidak ada konten buku yang relevan ditemukan untuk pertanyaan ini.';

      aiResponse = await chatCompletion([
        { role: 'assistant', content: systemMsg },
        { role: 'user', content: message }
      ]);
    } catch {
      if (contextStr) {
        aiResponse = `Saya menemukan konten relevan dari buku, namun gagal menghasilkan jawaban AI. Berikut konteks yang ditemukan:\n\n${contextStr}`;
      } else {
        aiResponse = 'Maaf, saya tidak dapat terhubung ke layanan AI saat ini. Silakan coba lagi nanti.';
      }
    }

    const savedMessage = await db.message.create({
      data: {
        role: 'assistant', content: aiResponse,
        references: references ? JSON.stringify(references) : null, chatId
      }
    });

    await db.activity.create({
      data: { type: 'chat', title: `Pertanyaan: ${message.slice(0, 50)}`, details: `Chat: ${chat?.title || 'Baru'}`, userId: user.id }
    });

    return NextResponse.json({
      id: savedMessage.id, role: 'assistant', content: aiResponse, references
    });
  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json({ error: 'Gagal mengirim pesan' }, { status: 500 });
  }
}
