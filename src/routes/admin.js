import { Router } from 'express';
import { body } from 'express-validator';
import { 
  listUsers,
  updateUserStatus,
  moderateJob,
  resolveDispute,
  getAdminLogs,
  getDashboardStats,
  getRevenueChart,
  updateSettings,
  getPaymentOverview
} from '../controllers/admin.js';
import { validateRequest } from '../middleware/validate.js';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';

const router = Router();

// Existing validation middleware...

// New validation middleware
const settingsValidation = [
  body('platformFee').isFloat({ min: 0, max: 100 })
    .withMessage('Platform fee must be between 0 and 100'),
  body('minProjectBudget').isFloat({ min: 0 })
    .withMessage('Minimum project budget must be greater than 0'),
  body('maxProjectBudget').isFloat({ min: 0 })
    .custom((value, { req }) => {
      if (value <= req.body.minProjectBudget) {
        throw new Error('Maximum budget must be greater than minimum budget');
      }
      return true;
    }),
  body('allowedPaymentMethods').isArray()
    .withMessage('Allowed payment methods must be an array'),
  body('emailNotifications').isObject()
    .withMessage('Email notifications must be an object'),
  validateRequest
];

// Existing routes...

// New routes
router.get(
  '/dashboard/stats',
  authenticateUser,
  authorizeRole(['admin']),
  getDashboardStats
);

router.get(
  '/dashboard/revenue-chart',
  authenticateUser,
  authorizeRole(['admin']),
  getRevenueChart
);

router.put(
  '/settings',
  authenticateUser,
  authorizeRole(['admin']),
  settingsValidation,
  updateSettings
);

router.get(
  '/payments/overview',
  authenticateUser,
  authorizeRole(['admin']),
  getPaymentOverview
);

export default router;