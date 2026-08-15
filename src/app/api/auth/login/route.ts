import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { username } });
    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    return NextResponse.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Login gagal' }, { status: 500 });
  }
}