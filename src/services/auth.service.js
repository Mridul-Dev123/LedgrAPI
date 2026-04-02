import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

import jwt from 'jsonwebtoken';

import pool from '../config/db.js';
import { ApiError } from '../utils/index.js';

const ALLOWED_ROLES = ['viewer', 'analyst', 'admin'];

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.is_active,
});

const requireEnv = (key) => {
  const value = process.env[key];

  if (!value) {
    throw new ApiError(500, `${key} is not configured`);
  }

  return value;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getExpiryDateFromToken = (token) => {
  const decodedToken = jwt.decode(token);

  if (!decodedToken?.exp) {
    throw new ApiError(500, 'Unable to determine token expiry');
  }

  return new Date(decodedToken.exp * 1000);
};

const buildAccessToken = (user) =>
  jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version,
    },
    requireEnv('JWT_ACCESS_SECRET'),
    { expiresIn: ACCESS_TOKEN_TTL }
  );

const buildRefreshToken = ({ user, sessionId }) =>
  jwt.sign(
    {
      sub: String(user.id),
      sessionId,
      tokenVersion: user.token_version,
    },
    requireEnv('JWT_REFRESH_SECRET'),
    { expiresIn: REFRESH_TOKEN_TTL }
  );

const createSessionAndTokens = async (client, user, metadata = {}) => {
  const sessionId = crypto.randomUUID();
  const accessToken = buildAccessToken(user);
  const refreshToken = buildRefreshToken({ user, sessionId });
  const refreshTokenHash = hashToken(refreshToken);
  const refreshTokenExpiresAt = getExpiryDateFromToken(refreshToken);

  await client.query(
    `INSERT INTO auth_sessions
      (user_id, session_id, refresh_token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      user.id,
      sessionId,
      refreshTokenHash,
      refreshTokenExpiresAt,
      metadata.userAgent || null,
      metadata.ipAddress || null,
    ]
  );

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiresAt,
    user: serializeUser(user),
  };
};

const registerUserService = async ({ name, email, password, metadata }) => {
  if (password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const createdUserResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, is_active, token_version`,
      [name, email, passwordHash, 'viewer']
    );

    const createdUser = createdUserResult.rows[0];
    const authPayload = await createSessionAndTokens(client, createdUser, metadata);

    await client.query('COMMIT');
    return authPayload;
  } catch (error) {
    await client.query('ROLLBACK');

    if (error.code === '23505') {
      throw new ApiError(409, 'User with this email already exists');
    }

    throw error;
  } finally {
    client.release();
  }
};

const loginUserService = async ({ email, password, metadata }) => {
  const userResult = await pool.query(
    `SELECT id, name, email, password_hash, role, is_active, token_version
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email]
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.is_active) {
    throw new ApiError(403, 'User account is inactive');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const authPayload = await createSessionAndTokens(client, user, metadata);
    await client.query('COMMIT');
    return authPayload;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const refreshAuthSessionService = async ({ refreshToken, metadata }) => {
  let decodedToken;

  try {
    decodedToken = jwt.verify(refreshToken, requireEnv('JWT_REFRESH_SECRET'));
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const refreshTokenHash = hashToken(refreshToken);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const sessionResult = await client.query(
      `SELECT
         s.id AS auth_session_id,
         s.session_id,
         s.user_id,
         s.expires_at,
         u.id,
         u.name,
         u.email,
         u.role,
         u.is_active,
         u.token_version
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = $1
         AND s.revoked_at IS NULL
       LIMIT 1`,
      [refreshTokenHash]
    );

    const session = sessionResult.rows[0];

    if (!session) {
      throw new ApiError(401, 'Refresh session not found');
    }

    if (!session.is_active) {
      throw new ApiError(403, 'User account is inactive');
    }

    if (
      session.session_id !== decodedToken.sessionId ||
      String(session.user_id) !== decodedToken.sub
    ) {
      await client.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1', [
        session.auth_session_id,
      ]);
      throw new ApiError(401, 'Refresh token does not match this session');
    }

    if (session.token_version !== decodedToken.tokenVersion) {
      await client.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1', [
        session.auth_session_id,
      ]);
      throw new ApiError(401, 'Refresh token has been invalidated');
    }

    if (new Date(session.expires_at) <= new Date()) {
      await client.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1', [
        session.auth_session_id,
      ]);
      throw new ApiError(401, 'Refresh token has expired');
    }

    await client.query('UPDATE auth_sessions SET revoked_at = NOW() WHERE id = $1', [
      session.auth_session_id,
    ]);

    const authPayload = await createSessionAndTokens(client, session, metadata);
    await client.query('COMMIT');
    return authPayload;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const logoutUserService = async ({ refreshToken }) => {
  const refreshTokenHash = hashToken(refreshToken);

  await pool.query(
    `UPDATE auth_sessions
     SET revoked_at = NOW()
     WHERE refresh_token_hash = $1
       AND revoked_at IS NULL`,
    [refreshTokenHash]
  );
};

const getCurrentUserService = async (userId) => {
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

const changePasswordService = async ({ userId, currentPassword, newPassword, metadata }) => {
  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters long');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `SELECT id, name, email, password_hash, role, is_active, token_version
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isCurrentPasswordValid) {
      throw new ApiError(401, 'Current password is incorrect');
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    const updatedUserResult = await client.query(
      `UPDATE users
       SET password_hash = $1, token_version = token_version + 1
       WHERE id = $2
       RETURNING id, name, email, role, is_active, token_version`,
      [newPasswordHash, userId]
    );

    await client.query(
      `UPDATE auth_sessions
       SET revoked_at = NOW()
       WHERE user_id = $1
         AND revoked_at IS NULL`,
      [userId]
    );

    const updatedUser = updatedUserResult.rows[0];
    const authPayload = await createSessionAndTokens(client, updatedUser, metadata);

    await client.query('COMMIT');
    return authPayload;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export {
  ALLOWED_ROLES,
  changePasswordService,
  getCurrentUserService,
  loginUserService,
  logoutUserService,
  refreshAuthSessionService,
  registerUserService,
};
