import { Router } from 'express';
import { 
  getConversations,
  getMessages
} from '../controllers/messages.js';
import { authenticateUser } from '../middleware/auth.js';

const router = Router();

router.get(
  '/conversations',
  authenticateUser,
  getConversations
);

router.get(
  '/messages/:partnerId',
  authenticateUser,
  getMessages
);

export default router;