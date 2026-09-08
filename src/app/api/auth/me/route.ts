import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db/client';

export async function GET() {
  try {
    const userPayload = await getCurrentUser();
    if (!userPayload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const user = await db.prepare(`
      SELECT id, name, email, role, monthly_income, current_cash, payday_day, is_active
      FROM users
      WHERE id = ?
    `).get(userPayload.userId) as {
      id: string;
      name: string;
      email: string;
      role: 'ADMIN' | 'USER';
      monthly_income: number;
      current_cash: number;
      payday_day: number;
      is_active: number;
    } | undefined;

    if (!user || !user.is_active) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        ...user,
        monthly_income: Number(user.monthly_income),
        current_cash: Number(user.current_cash),
      }
    });
  } catch (err: unknown) {
    console.error('Me error:', err);
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 });
  }
}
