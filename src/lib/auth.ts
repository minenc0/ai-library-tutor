import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

const TOKEN_SECRET = 'ai-library-tutor-secret-key-2024';

export function generateToken(user: { id: string; username: string; role: string }): string {
  return btoa(JSON.stringify({
    id: user.id,
    username: user.username,
    role: user.role,
    exp: Date.now() + 24 * 60 * 60 * 1000
  }));
}

export function verifyToken(token: string): { id: string; username: string; role: string } | null {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (decoded.exp && decoded.exp < Date.now()) return null;
    return { id: decoded.id, username: decoded.username, role: decoded.role };
  } catch {
    return null;
  }
}

export function getToken(req: NextRequest): string | null {
  const auth = req.headers.get('Authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function authenticate(req: NextRequest) {
  const token = getToken(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await db.user.findUnique({ where: { id: payload.id } });
  return user;
}
