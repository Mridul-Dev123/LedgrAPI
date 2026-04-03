import { Router } from 'express';

import { getDashboardInsights, getDashboardSummary } from '../controllers/dashboard.controller.js';
import verifyJWT from '../middleware/auth.js';
import requireRoles from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import { getDashboardInsightsRequest } from '../validators/request.schemas.js';

const dashboardRouter = Router();

dashboardRouter.use(verifyJWT);

dashboardRouter.get('/summary', requireRoles('viewer', 'analyst', 'admin'), getDashboardSummary);
dashboardRouter.get(
  '/insights',
  requireRoles('analyst', 'admin'),
  validate(getDashboardInsightsRequest),
  getDashboardInsights
);

export default dashboardRouter;
