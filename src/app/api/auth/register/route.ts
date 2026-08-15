import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await authenticate(req);
    if (!admin || admin.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang dapat membuat pengguna' }, { status: 403 });
    }
    const { username, password, role } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }
    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 409 });
    }
    const user = await db.user.create({
      data: { username, password, role: role || 'user' }
    });
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    return NextResponse.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Gagal membuat pengguna' }, { status: 500 });
  }
}