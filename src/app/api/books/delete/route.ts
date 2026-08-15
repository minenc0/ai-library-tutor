import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID buku wajib diisi' }, { status: 400 });
    const book = await db.book.findUnique({ where: { id }, include: { _count: { select: { documents: true, chats: true } } } });
    if (!book) return NextResponse.json({ error: 'Buku tidak ditemukan' }, { status: 404 });
    await db.document.deleteMany({ where: { bookId: id } });
    await db.message.deleteMany({ where: { chat: { bookId: id } } });
    await db.chat.deleteMany({ where: { bookId: id } });
    await db.book.delete({ where: { id } });
    await db.activity.create({ data: { type: 'delete', title: `Menghapus buku: ${book.title}`, userId: user.id } });
    return NextResponse.json({ message: 'Buku berhasil dihapus' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Gagal menghapus buku' }, { status: 500 });
  }
}