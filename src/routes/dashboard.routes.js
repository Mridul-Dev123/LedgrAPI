import { Router } from 'express';

import { getDashboardInsights, getDashboardSummary } from '../controllers/dashboard.controller.js';
import verifyJWT from '../middleware/auth.js';
import requireRoles from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  getDashboardInsightsRequest,
  getDashboardSummaryRequest,
} from '../validators/request.schemas.js';

const dashboardRouter = Router();

dashboardRouter.use(verifyJWT);

/**
 * @swagger
 * /api/v1/dashboard/summary:
 *   get:
 *     summary: Get dashboard summary metrics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         description: Number of recent transactions to include in the response.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 5
 *     responses:
 *       200:
 *         description: Dashboard summary fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Dashboard summary fetched successfully
 *                     data:
 *                       $ref: '#/components/schemas/DashboardSummary'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
dashboardRouter.get(
  '/summary',
  requireRoles('viewer', 'analyst', 'admin'),
  validate(getDashboardSummaryRequest),
  getDashboardSummary
);

/**
 * @swagger
 * /api/v1/dashboard/insights:
 *   get:
 *     summary: Get category totals and trend analytics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/StartDate'
 *       - $ref: '#/components/parameters/EndDate'
 *     responses:
 *       200:
 *         description: Dashboard insights fetched successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessEnvelope'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       example: Dashboard insights fetched successfully
 *                     data:
 *                       $ref: '#/components/schemas/DashboardInsights'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
dashboardRouter.get(
  '/insights',
  requireRoles('analyst', 'admin'),
  validate(getDashboardInsightsRequest),
  getDashboardInsights
);

export default dashboardRouter;
