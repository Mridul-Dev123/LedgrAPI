import {
  createUserService,
  getUserByIdService,
  listUsersService,
  updateUserRoleService,
  updateUserStatusService,
} from '../services/users.service.js';
import { ApiError, ApiResponse, asyncHandler } from '../utils/index.js';

const listUsers = asyncHandler(async (_req, res) => {
  const users = await listUsersService();
  return res.status(200).json(new ApiResponse(200, users, 'Users fetched successfully'));
});

const getUserById = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ApiError(400, 'A valid user id is required');
  }

  const user = await getUserByIdService(userId);
  return res.status(200).json(new ApiResponse(200, user, 'User fetched successfully'));
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, isActive } = req.body;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  const user = await createUserService({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password,
    role: role?.trim()?.toLowerCase() || 'viewer',
    isActive: typeof isActive === 'boolean' ? isActive : true,
  });

  return res.status(201).json(new ApiResponse(201, user, 'User created successfully'));
});

const updateUserRole = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const { role } = req.body;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ApiError(400, 'A valid user id is required');
  }

  if (!role?.trim()) {
    throw new ApiError(400, 'Role is required');
  }

  const user = await updateUserRoleService({
    actorUserId: req.user.id,
    targetUserId: userId,
    role: role.trim().toLowerCase(),
  });

  return res.status(200).json(new ApiResponse(200, user, 'User role updated successfully'));
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  const { isActive } = req.body;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ApiError(400, 'A valid user id is required');
  }

  const user = await updateUserStatusService({
    actorUserId: req.user.id,
    targetUserId: userId,
    isActive,
  });

  return res.status(200).json(new ApiResponse(200, user, 'User status updated successfully'));
});

export { createUser, getUserById, listUsers, updateUserRole, updateUserStatus };
