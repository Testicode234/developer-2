import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createMilestone,
  releaseMilestonePayment,
  listMilestones
} from '../controllers/milestones.js';
import { validateRequest } from '../middleware/validate.js';
import { authenticateUser, authorizeRole } from '../middleware/auth.js';

const router = Router();

const milestoneValidation = [
  body('title').trim().notEmpty()
    .withMessage('Milestone title is required'),
  body('description').trim().notEmpty()
    .withMessage('Milestone description is required'),
  body('amount').isNumeric()
    .withMessage('Amount must be a number')
    .custom(value => {
      if (value <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      return true;
    }),
  body('deadline').isISO8601()
    .withMessage('Invalid deadline date')
    .custom(value => {
      if (new Date(value) < new Date()) {
        throw new Error('Deadline must be in the future');
      }
      return true;
    }),
  validateRequest
];

router.post(
  '/projects/:projectId/milestones',
  authenticateUser,
  authorizeRole(['client']),
  milestoneValidation,
  createMilestone
);

router.post(
  '/milestones/:milestoneId/release',
  authenticateUser,
  authorizeRole(['client']),
  releaseMilestonePayment
);

router.get(
  '/projects/:projectId/milestones',
  authenticateUser,
  listMilestones
);

export default router;