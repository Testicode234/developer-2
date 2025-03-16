import { Router } from 'express';
import { body } from 'express-validator';
import { 
  register, 
  login, 
  logout,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile
} from '../controllers/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

// Registration validation
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('fullName').trim().notEmpty()
    .withMessage('Full name is required'),
  body('userType').isIn(['client', 'developer'])
    .withMessage('User type must be either client or developer'),
  validateRequest
];

// Login validation
const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validateRequest
];

// Password reset validation
const resetPasswordValidation = [
  body('password').isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  validateRequest
];

// Profile update validation
const updateProfileValidation = [
  body('full_name').optional().trim().notEmpty(),
  body('avatar_url').optional().isURL(),
  validateRequest
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', 
  body('email').isEmail().normalizeEmail(),
  validateRequest,
  forgotPassword
);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Protected routes
router.post('/logout', authenticateUser, logout);
router.get('/profile', authenticateUser, getProfile);
router.put('/profile', authenticateUser, updateProfileValidation, updateProfile);

export default router;