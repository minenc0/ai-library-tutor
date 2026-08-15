import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const chat = await db.chat.findUnique({
        where: { id },
        include: { messages: { orderBy: { createdAt: 'asc' } }, book: { select: { title: true } } }
      });
      if (!chat || chat.userId !== user.id) return NextResponse.json({ error: 'Chat tidak ditemukan' }, { status: 404 });
      return NextResponse.json(chat);
    }

    const chats = await db.chat.findMany({
      where: { userId: user.id },
      include: { _count: { select: { messages: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json(chats);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Gagal memuat chat' }, { status: 500 });
  }
}
