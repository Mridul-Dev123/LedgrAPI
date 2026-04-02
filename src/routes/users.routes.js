import { Router } from 'express';
import { registerUser } from '../controllers/auth.controllers.js';

const userRouter = Router();

userRouter.post('/register', registerUser);

export default userRouter;
