import { ApiError } from '../utils/index.js';

const requireRoles =
  (...allowedRoles) =>
  (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication is required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to access this resource'));
    }

    return next();
  };

export default requireRoles;
