import { Router } from 'express';
import userRoutes from './users/user.route.js';
import cardRoutes from './cards/card.route.js';
import matchHistoryRoutes from './matchHistory/matchHistory.route.js';

const router = Router();

router.use('/users', userRoutes);
router.use('/cards', cardRoutes);
router.use('/match-history', matchHistoryRoutes);

export default router;