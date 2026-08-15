import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';

export async function POST() {
  try {
    const existing = await db.user.findUnique({ where: { username: 'admin' } });
    if (!existing) {
      const admin = await db.user.create({
        data: { username: 'admin', password: 'admin123', role: 'admin' }
      });
      const token = generateToken({ id: admin.id, username: admin.username, role: admin.role });
      return NextResponse.json({ message: 'Seed completed', token, user: admin });
    }
    const token = generateToken({ id: existing.id, username: existing.username, role: existing.role });
    return NextResponse.json({ message: 'Seed completed', token, user: existing });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}