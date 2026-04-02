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

const authRouter = Router();

authRouter.post('/register', registerUser);
authRouter.post('/login', loginUser);
authRouter.post('/refresh', refreshSession);
authRouter.post('/logout', logoutUser);
authRouter.get('/me', verifyJWT, getCurrentUser);
authRouter.post('/change-password', verifyJWT, changePassword);

export default authRouter;
