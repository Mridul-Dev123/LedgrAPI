import jwt from 'jsonwebtoken';

import pool from '../config/db.js';
import { ApiError } from '../utils/index.js';

const verifyJWT = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Access token is required'));
  }

  const accessToken = authHeader.split(' ')[1];
  const accessSecret = process.env.JWT_ACCESS_SECRET;

  if (!accessSecret) {
    return next(new ApiError(500, 'JWT_ACCESS_SECRET is not configured'));
  }

  let decodedToken;

  try {
    decodedToken = jwt.verify(accessToken, accessSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, 'Invalid or expired access token'));
    }

    return next(error);
  }

  const userResult = await pool.query(
    `SELECT id, name, email, role, is_active, token_version
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [decodedToken.sub]
  );

  const user = userResult.rows[0];

  if (!user) {
    return next(new ApiError(401, 'User not found for this token'));
  }

  if (!user.is_active) {
    return next(new ApiError(403, 'User account is inactive'));
  }

  if (user.token_version !== decodedToken.tokenVersion) {
    return next(new ApiError(401, 'Invalid or expired access token'));
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tokenVersion: user.token_version,
  };

  return next();
};

export default verifyJWT;
