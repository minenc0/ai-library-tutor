import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { title, bookId } = await req.json();
    const chat = await db.chat.create({
      data: { title: title || 'Percakapan Baru', bookId, userId: user.id }
    });
    return NextResponse.json(chat);
  } catch (error) {
    console.error('Chat create error:', error);
    return NextResponse.json({ error: 'Gagal membuat percakapan' }, { status: 500 });
  }
}