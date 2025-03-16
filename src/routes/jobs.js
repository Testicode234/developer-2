import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createJob,
  listJobs,
  getJob,
  updateJob,
  deleteJob,
  applyToJob,
  listApplications
} from '../controllers/jobs.js';
import { validateRequest } from '../middleware/validate.js';
import { authenticateUser } from '../middleware/auth.js';
import { authorizeRole } from '../middleware/auth.js';

const router = Router();

// Job validation
const jobValidation = [
  body('title').trim().notEmpty()
    .withMessage('Job title is required'),
  body('description').trim().notEmpty()
    .withMessage('Job description is required'),
  body('budgetMin').isNumeric()
    .withMessage('Minimum budget must be a number'),
  body('budgetMax').isNumeric()
    .withMessage('Maximum budget must be a number')
    .custom((value, { req }) => {
      if (value < req.body.budgetMin) {
        throw new Error('Maximum budget must be greater than minimum budget');
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
  body('skills').isArray()
    .withMessage('Skills must be an array')
    .custom(value => {
      if (value.length === 0) {
        throw new Error('At least one skill is required');
      }
      return true;
    }),
  validateRequest
];

// Application validation
const applicationValidation = [
  body('coverLetter').trim().notEmpty()
    .withMessage('Cover letter is required')
    .isLength({ min: 100, max: 1000 })
    .withMessage('Cover letter must be between 100 and 1000 characters'),
  validateRequest
];

// Public routes
router.get('/list', listJobs);
router.get('/:id', getJob);

// Protected routes
router.post(
  '/create',
  authenticateUser,
  authorizeRole(['client']),
  jobValidation,
  createJob
);

router.put(
  '/:id',
  authenticateUser,
  authorizeRole(['client']),
  jobValidation,
  updateJob
);

router.delete(
  '/:id',
  authenticateUser,
  authorizeRole(['client']),
  deleteJob
);

router.post(
  '/:id/apply',
  authenticateUser,
  authorizeRole(['developer']),
  applicationValidation,
  applyToJob
);

router.get(
  '/applications/list',
  authenticateUser,
  listApplications
);

export default router;