import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { createDefaultCategoriesForUser } from '@/lib/db/categories-default';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    await requireAdmin();

    const users = await db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        u.last_login_at,
        u.last_active_at,
        COALESCE(c_count.total_categories, 0) as total_categories,
        COALESCE(pm_count.total_payment_methods, 0) as total_payment_methods,
        COALESCE(poc_count.total_pockets, 0) as total_pockets,
        COALESCE(g_count.total_goals, 0) as total_goals,
        COALESCE(l_count.total_loans, 0) as total_loans,
        COALESCE(e_count.total_movements, 0) as total_movements,
        COALESCE(e_recent.recent_movements_30d, 0) as recent_movements_30d,
        e_latest.latest_movement_at
      FROM users u
      LEFT JOIN (SELECT user_id, COUNT(*) as total_categories FROM categories GROUP BY user_id) c_count ON c_count.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) as total_payment_methods FROM payment_methods GROUP BY user_id) pm_count ON pm_count.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) as total_pockets FROM account_pockets GROUP BY user_id) poc_count ON poc_count.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) as total_goals FROM goals GROUP BY user_id) g_count ON g_count.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) as total_loans FROM loans GROUP BY user_id) l_count ON l_count.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) as total_movements FROM expenses GROUP BY user_id) e_count ON e_count.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) as recent_movements_30d FROM expenses WHERE date >= CURRENT_DATE - 30 GROUP BY user_id) e_recent ON e_recent.user_id = u.id
      LEFT JOIN (SELECT user_id, MAX(created_at) as latest_movement_at FROM expenses GROUP BY user_id) e_latest ON e_latest.user_id = u.id
      ORDER BY u.created_at DESC
    `).all() as any[];

    const now = Date.now();

    const mapped = users.map(u => {
      const total_movements = Number(u.total_movements || 0);
      const recent_movements_30d = Number(u.recent_movements_30d || 0);
      const total_categories = Number(u.total_categories || 0);
      const total_payment_methods = Number(u.total_payment_methods || 0);
      const total_pockets = Number(u.total_pockets || 0);
      const total_goals = Number(u.total_goals || 0);
      const total_loans = Number(u.total_loans || 0);

      const timestamps = [
        u.last_active_at ? new Date(u.last_active_at).getTime() : 0,
        u.last_login_at ? new Date(u.last_login_at).getTime() : 0,
        u.latest_movement_at ? new Date(u.latest_movement_at).getTime() : 0,
      ].filter(t => t > 0);

      const lastSeenTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;
      const lastSeenAt = lastSeenTimestamp ? new Date(lastSeenTimestamp).toISOString() : null;

      const daysSinceLastSeen = lastSeenTimestamp 
        ? Math.max(0, Math.floor((now - lastSeenTimestamp) / (1000 * 60 * 60 * 24)))
        : null;

      let healthStatus: 'ACTIVE' | 'MODERATE' | 'INACTIVE' | 'NEW' = 'NEW';
      if (total_movements === 0 && !lastSeenTimestamp) {
        healthStatus = 'NEW';
      } else if (daysSinceLastSeen !== null && daysSinceLastSeen <= 7) {
        healthStatus = 'ACTIVE';
      } else if (daysSinceLastSeen !== null && daysSinceLastSeen <= 30) {
        healthStatus = 'MODERATE';
      } else {
        healthStatus = 'INACTIVE';
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        is_active: Number(u.is_active),
        created_at: u.created_at,
        last_login_at: u.last_login_at,
        last_active_at: u.last_active_at,
        latest_movement_at: u.latest_movement_at,
        last_seen_at: lastSeenAt,
        days_since_last_seen: daysSinceLastSeen,
        health_status: healthStatus,
        metrics: {
          total_categories,
          total_payment_methods,
          total_pockets,
          total_goals,
          total_loans,
          total_movements,
          recent_movements_30d,
        }
      };
    });

    return NextResponse.json({ users: mapped });
  } catch (err: unknown) {
    if ((err as Error).message === 'FORBIDDEN' || (err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Acceso denegado: Solo el Administrador puede gestionar usuarios' }, { status: 403 });
    }
    console.error('Error fetching admin users:', err);
    return NextResponse.json({ error: 'Error al consultar usuarios' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nombre, correo y contraseña son requeridos' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con este correo electrónico' }, { status: 400 });
    }

    const id = randomUUID();
    const passwordHash = hashPassword(password);
    const assignedRole = role === 'ADMIN' ? 'ADMIN' : 'USER';

    await db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, monthly_income, current_cash, payday_day, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      cleanEmail,
      passwordHash,
      assignedRole,
      2000000,
      200000,
      30,
      1
    );

    await createDefaultCategoriesForUser(id);

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

    if (id === admin.userId && is_active === 0) {
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta de administrador' }, { status: 400 });
    }

    if (reset_password) {
      const newHash = hashPassword(reset_password);
      await db.prepare(`UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`).run(newHash, id);
    }

    await db.prepare(`
      UPDATE users
      SET 
        is_active = COALESCE(?, is_active),
        role = COALESCE(?, role),
        updated_at = NOW()
      WHERE id = ?
    `).run(is_active !== undefined ? (is_active ? 1 : 0) : null, role || null, id);

    return NextResponse.json({ success: true, message: 'Usuario actualizado' });
  } catch (err: unknown) {
    if ((err as Error).message === 'FORBIDDEN' || (err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Error actualizando usuario' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {
        // No body
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    if (id === admin.userId) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta de administrador' }, { status: 400 });
    }

    const targetUser = await db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(id) as { id: string; name: string; role: string } | undefined;
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetUser.role === 'ADMIN') {
      return NextResponse.json({ error: 'No se pueden eliminar cuentas con rol de Administrador' }, { status: 400 });
    }

    // Deleting user will cascade to all related tables
    await db.prepare('DELETE FROM users WHERE id = ?').run(id);

    return NextResponse.json({
      success: true,
      message: `El usuario "${targetUser.name}" y todos sus registros han sido eliminados permanentemente.`
    });
  } catch (err: unknown) {
    if ((err as Error).message === 'FORBIDDEN' || (err as Error).message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }
    console.error('Error deleting user:', err);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
