import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const books = await db.book.findMany({
      where: { userId: user.id, ...(q ? { title: { contains: q } } : {}) },
      include: { _count: { select: { documents: true, chats: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const stats = { total: books.length, ready: books.filter(b => b.status === 'ready').length, processing: books.filter(b => b.status === 'processing').length, error: books.filter(b => b.status === 'error').length };
    return NextResponse.json({ books, stats });
  } catch (error) {
    console.error('Books error:', error);
    return NextResponse.json({ error: 'Gagal memuat buku' }, { status: 500 });
  }
}