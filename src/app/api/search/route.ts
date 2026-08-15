import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { keywordSearch } from '@/lib/text-processing';

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    if (!q.trim()) return NextResponse.json({ results: [] });

    const documents = await db.document.findMany({
      where: { book: { userId: user.id } },
      include: { book: { select: { title: true } } }
    });

    const docSearch = documents.map(d => ({ content: d.content, page: d.page, bookTitle: d.book.title }));
    const results = keywordSearch(q, docSearch, 10);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Gagal mencari' }, { status: 500 });
  }
}