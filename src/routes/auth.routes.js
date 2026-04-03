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

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     statusCode:
 *                       example: 201
 *                     message:
 *                       example: User registered successfully
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponseData'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post('/register', authLimiter, validate(registerUserRequest), registerUser);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Login successful
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponseData'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post('/login', authLimiter, validate(loginUserRequest), loginUser);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh the access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Token refreshed successfully
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponseData'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post('/refresh', authLimiter, refreshSession);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout the current user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Logout successful
 *                     data:
 *                       type: 'null'
 *                       nullable: true
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post('/logout', logoutUser);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Current user fetched successfully
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.get('/me', verifyJWT, getCurrentUser);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change the current user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Password changed successfully
 *                     data:
 *                       $ref: '#/components/schemas/AuthResponseData'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post(
  '/change-password',
  verifyJWT,
  authLimiter,
  validate(changePasswordRequest),
  changePassword
);

export default authRouter;
