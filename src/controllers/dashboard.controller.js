import {
  getDashboardInsightsService,
  getDashboardSummaryService,
} from '../services/dashboard.service.js';
import { ApiError, ApiResponse, asyncHandler } from '../utils/index.js';

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, `${fieldName} must be in YYYY-MM-DD format`);
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, `${fieldName} must be a valid date`);
  }

  return value;
};

const getDashboardSummary = asyncHandler(async (_req, res) => {
  const summary = await getDashboardSummaryService();
  return res
    .status(200)
    .json(new ApiResponse(200, summary, 'Dashboard summary fetched successfully'));
});

const getDashboardInsights = asyncHandler(async (req, res) => {
  const startDate = parseOptionalDate(req.query.startDate, 'startDate');
  const endDate = parseOptionalDate(req.query.endDate, 'endDate');

  if (startDate && endDate && startDate > endDate) {
    throw new ApiError(400, 'startDate cannot be greater than endDate');
  }

  const insights = await getDashboardInsightsService({ startDate, endDate });
  return res
    .status(200)
    .json(new ApiResponse(200, insights, 'Dashboard insights fetched successfully'));
});

export { getDashboardInsights, getDashboardSummary };
