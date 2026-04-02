import { Router } from 'express';
import {
  createUser,
  getUserById,
  listUsers,
  updateUserRole,
  updateUserStatus,
} from '../controllers/users.controller.js';
import verifyJWT from '../middleware/auth.js';
import requireRoles from '../middleware/rbac.js';

const userRouter = Router();

userRouter.use(verifyJWT, requireRoles('admin'));

userRouter.get('/', listUsers);
userRouter.get('/:userId', getUserById);
userRouter.post('/', createUser);
userRouter.patch('/:userId/role', updateUserRole);
userRouter.patch('/:userId/status', updateUserStatus);

export default userRouter;
