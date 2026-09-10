import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { hashPassword, signToken } from '@/lib/auth';
import { createDefaultCategoriesForUser } from '@/lib/db/categories-default';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, monthly_income } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nombre, correo y contraseña son obligatorios' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una cuenta con este correo electrónico' }, { status: 400 });
    }

    const id = randomUUID();
    const passwordHash = hashPassword(password);
    const assignedRole = 'USER';
    const income = Number(monthly_income) || 0;

    await db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, monthly_income, current_cash, payday_day, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      cleanEmail,
      passwordHash,
      assignedRole,
      income,
      200000,
      30,
      1
    );

    await createDefaultCategoriesForUser(id);

    const token = await signToken({
      userId: id,
      email: cleanEmail,
      name: name.trim(),
      role: 'USER',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id,
        name: name.trim(),
        email: cleanEmail,
        role: 'USER',
      },
    });

    const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: 'pos_auth_token',
      value: token,
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: unknown) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Error interno al registrar cuenta' }, { status: 500 });
  }
}
