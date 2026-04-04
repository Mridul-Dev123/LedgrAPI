import {
  getDashboardInsightsService,
  getDashboardSummaryService,
} from '../services/dashboard.service.js';
import { ApiError, ApiResponse, asyncHandler } from '../utils/index.js';

const getDashboardSummary = asyncHandler(async (req, res) => {
  // Allow the client to request a specific number of recent transactions, default to 5
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
  const summary = await getDashboardSummaryService({ limit });
  return res
    .status(200)
    .json(new ApiResponse(200, summary, 'Dashboard summary fetched successfully'));
});

const getDashboardInsights = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const insights = await getDashboardInsightsService({ startDate, endDate });
  return res
    .status(200)
    .json(new ApiResponse(200, insights, 'Dashboard insights fetched successfully'));
});

export { getDashboardInsights, getDashboardSummary };
