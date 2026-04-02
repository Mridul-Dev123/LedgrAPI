import {
  changePasswordService,
  getCurrentUserService,
  loginUserService,
  logoutUserService,
  refreshAuthSessionService,
  registerUserService,
} from '../services/auth.service.js';
import { ApiError, ApiResponse, asyncHandler } from '../utils/index.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const parseCookies = (cookieHeader = '') =>
  cookieHeader.split(';').reduce((cookies, cookiePart) => {
    const [rawKey, ...rawValueParts] = cookiePart.trim().split('=');

    if (!rawKey) {
      return cookies;
    }

    cookies[rawKey] = decodeURIComponent(rawValueParts.join('='));
    return cookies;
  }, {});

const getRefreshTokenFromRequest = (req) => {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken || null;
};

const getRefreshCookieOptions = (refreshTokenExpiresAt) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  expires: refreshTokenExpiresAt,
});

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
};

const getRequestMetadata = (req) => ({
  userAgent: req.get('user-agent') || null,
  ipAddress: req.ip || req.socket?.remoteAddress || null,
});

const sendAuthResponse = (res, statusCode, authPayload, message) => {
  res.cookie(
    REFRESH_COOKIE_NAME,
    authPayload.refreshToken,
    getRefreshCookieOptions(authPayload.refreshTokenExpiresAt)
  );

  return res.status(statusCode).json(
    new ApiResponse(
      statusCode,
      {
        user: authPayload.user,
        accessToken: authPayload.accessToken,
      },
      message
    )
  );
};

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  const authPayload = await registerUserService({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    metadata: getRequestMetadata(req),
  });

  return sendAuthResponse(res, 201, authPayload, 'User registered successfully');
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password?.trim()) {
    throw new ApiError(400, 'Email and password are required');
  }

  const authPayload = await loginUserService({
    email: email.trim().toLowerCase(),
    password,
    metadata: getRequestMetadata(req),
  });

  return sendAuthResponse(res, 200, authPayload, 'Login successful');
});

const refreshSession = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token is required');
  }

  const authPayload = await refreshAuthSessionService({
    refreshToken,
    metadata: getRequestMetadata(req),
  });

  return sendAuthResponse(res, 200, authPayload, 'Token refreshed successfully');
});

const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req);

  if (refreshToken) {
    await logoutUserService({ refreshToken });
  }

  clearRefreshCookie(res);

  return res.status(200).json(new ApiResponse(200, null, 'Logout successful'));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await getCurrentUserService(req.user.id);
  return res.status(200).json(new ApiResponse(200, user, 'Current user fetched successfully'));
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword?.trim() || !newPassword?.trim()) {
    throw new ApiError(400, 'Current password and new password are required');
  }

  const authPayload = await changePasswordService({
    userId: req.user.id,
    currentPassword,
    newPassword,
    metadata: getRequestMetadata(req),
  });

  return sendAuthResponse(res, 200, authPayload, 'Password changed successfully');
});

export { changePassword, getCurrentUser, loginUser, logoutUser, refreshSession, registerUser };
