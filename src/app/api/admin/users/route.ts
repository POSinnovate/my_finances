import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { createDefaultCategoriesForUser } from '@/lib/db/categories-default';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    await requireAdmin();

    const users = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.monthly_income,
        u.current_cash,
        u.is_active,
        u.created_at,
        COUNT(e.id) as total_expenses_count
      FROM users u
      LEFT JOIN expenses e ON e.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();

    return NextResponse.json({ users });
  } catch (err: unknown) {
    if ((err as Error).message === 'FORBIDDEN' || (err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Acceso denegado: Solo el Administrador puede gestionar usuarios' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error al consultar usuarios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { name, email, password, role, monthly_income, current_cash } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nombre, correo y contraseña son requeridos' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con este correo electrónico' }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);
    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, monthly_income, current_cash, payday_day, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      cleanEmail,
      passwordHash,
      assignedRole,
      Number(monthly_income) || 2000000,
      Number(current_cash) || 200000,
      30,
      1,
      now,
      now
    );

    // Populate initial default budget categories for this friend!
    createDefaultCategoriesForUser(id);

    return NextResponse.json({ success: true, id, message: `Usuario creado exitosamente para ${name}` });
  } catch (err: unknown) {
    if ((err as Error).message === 'FORBIDDEN' || (err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    console.error('Admin create user error:', err);
    return NextResponse.json({ error: 'Error al registrar amigo/usuario' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { id, is_active, role, reset_password } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    // Prevent admin from locking himself out
    if (id === admin.userId && is_active === 0) {
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta de administrador' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (reset_password) {
      const newHash = hashPassword(reset_password);
      db.prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`).run(newHash, now, id);
    }

    db.prepare(`
      UPDATE users
      SET 
        is_active = COALESCE(?, is_active),
        role = COALESCE(?, role),
        updated_at = ?
      WHERE id = ?
    `).run(is_active !== undefined ? (is_active ? 1 : 0) : null, role || null, now, id);

    return NextResponse.json({ success: true, message: 'Usuario actualizado' });
  } catch (err: unknown) {
    if ((err as Error).message === 'FORBIDDEN' || (err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error actualizando usuario' }, { status: 500 });
  }
}
