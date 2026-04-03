import { Router } from 'express';

import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
} from '../controllers/auth.controllers.js';
import verifyJWT from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import validate from '../middleware/validate.js';
import {
  changePasswordRequest,
  loginUserRequest,
  registerUserRequest,
} from '../validators/request.schemas.js';

const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerUserRequest), registerUser);
authRouter.post('/login', authLimiter, validate(loginUserRequest), loginUser);
authRouter.post('/refresh', authLimiter, refreshSession);
authRouter.post('/logout', logoutUser);
authRouter.get('/me', verifyJWT, getCurrentUser);
authRouter.post(
  '/change-password',
  verifyJWT,
  authLimiter,
  validate(changePasswordRequest),
  changePassword
);

export default authRouter;
