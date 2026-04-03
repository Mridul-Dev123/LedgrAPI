import { Router } from 'express';
import {
  createUser,
  getUserById,
  listUsers,
  updateUserRole,
  updateUserStatus,
} from '../controllers/users.controller.js';
import verifyJWT from '../middleware/auth.js';
import { mutationLimiter } from '../middleware/rateLimit.js';
import requireRoles from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createUserRequest,
  updateUserRoleRequest,
  updateUserStatusRequest,
  userIdParams,
} from '../validators/request.schemas.js';

const userRouter = Router();

userRouter.use(verifyJWT, requireRoles('admin'));

userRouter.get('/', listUsers);
userRouter.get('/:userId', validate(userIdParams), getUserById);
userRouter.post('/', mutationLimiter, validate(createUserRequest), createUser);
userRouter.patch('/:userId/role', mutationLimiter, validate(updateUserRoleRequest), updateUserRole);
userRouter.patch(
  '/:userId/status',
  mutationLimiter,
  validate(updateUserStatusRequest),
  updateUserStatus
);

export default userRouter;
