import bcrypt from 'bcryptjs';

import pool from '../config/db.js';
import { ALLOWED_ROLES } from './auth.service.js';
import { ApiError } from '../utils/index.js';

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.is_active,
});

const getUserByIdForUpdate = async (client, userId) => {
  const result = await client.query(
    `SELECT id, name, email, role, is_active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  return result.rows[0];
};

const listUsersService = async () => {
  const result = await pool.query(
    `SELECT id, name, email, role, is_active
     FROM users
     ORDER BY id ASC`
  );

  return result.rows.map(serializeUser);
};

const getUserByIdService = async (userId) => {
  const result = await pool.query(
    `SELECT id, name, email, role, is_active
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  const user = result.rows[0];

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return serializeUser(user);
};

const createUserService = async ({ name, email, password, role = 'viewer', isActive = true }) => {
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw new ApiError(400, 'Role must be one of: viewer, analyst, admin');
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, is_active`,
      [name, email, passwordHash, role, isActive]
    );

    return serializeUser(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      throw new ApiError(409, 'User with this email already exists');
    }

    throw error;
  }
};

const updateUserRoleService = async ({ actorUserId, targetUserId, role }) => {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new ApiError(400, 'Role must be one of: viewer, analyst, admin');
  }

  if (Number(actorUserId) === Number(targetUserId)) {
    throw new ApiError(400, 'Admins cannot change their own role from this endpoint');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingUser = await getUserByIdForUpdate(client, targetUserId);

    if (!existingUser) {
      throw new ApiError(404, 'User not found');
    }

    if (existingUser.role === role) {
      await client.query('COMMIT');
      return serializeUser(existingUser);
    }

    const updatedResult = await client.query(
      `UPDATE users
       SET role = $1, token_version = token_version + 1
       WHERE id = $2
       RETURNING id, name, email, role, is_active`,
      [role, targetUserId]
    );

    await client.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [targetUserId]
    );

    await client.query('COMMIT');
    return serializeUser(updatedResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateUserStatusService = async ({ actorUserId, targetUserId, isActive }) => {
  if (typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive must be a boolean value');
  }

  if (Number(actorUserId) === Number(targetUserId)) {
    throw new ApiError(400, 'Admins cannot change their own status from this endpoint');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingUser = await getUserByIdForUpdate(client, targetUserId);

    if (!existingUser) {
      throw new ApiError(404, 'User not found');
    }

    if (existingUser.is_active === isActive) {
      await client.query('COMMIT');
      return serializeUser(existingUser);
    }

    const updatedResult = await client.query(
      `UPDATE users
       SET is_active = $1, token_version = token_version + 1
       WHERE id = $2
       RETURNING id, name, email, role, is_active`,
      [isActive, targetUserId]
    );

    await client.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [targetUserId]
    );

    await client.query('COMMIT');
    return serializeUser(updatedResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export {
  createUserService,
  getUserByIdService,
  listUsersService,
  updateUserRoleService,
  updateUserStatusService,
};
