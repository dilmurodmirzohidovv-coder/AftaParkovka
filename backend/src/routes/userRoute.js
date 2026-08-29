import { Router } from 'express';
import { login } from '../auth/Login.js';
import { signup } from '../auth/Signup.js';
import { getMe, getAdminStats } from '../controllers/userController.js';
import { authMiddleware, adminMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);

router.get('/me', authMiddleware, getMe);
router.get('/admin/stats', authMiddleware, adminMiddleware, getAdminStats);

export default router;
