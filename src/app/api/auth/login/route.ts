import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    }

    const user = db.prepare(`
      SELECT id, name, email, password_hash, role, is_active
      FROM users
      WHERE LOWER(email) = LOWER(?)
    `).get(email) as {
      id: string;
      name: string;
      email: string;
      password_hash: string;
      role: 'ADMIN' | 'USER';
      is_active: number;
    } | undefined;

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Tu cuenta ha sido suspendida. Contacta al administrador.' }, { status: 403 });
    }

    const match = comparePassword(password, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set({
      name: 'pos_auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: unknown) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Error interno en el servidor' }, { status: 500 });
  }
}
