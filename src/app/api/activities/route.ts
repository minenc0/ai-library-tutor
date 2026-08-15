import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const activities = await db.activity.findMany({
      where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: limit
    });
    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Activities error:', error);
    return NextResponse.json({ error: 'Gagal memuat aktivitas' }, { status: 500 });
  }
}