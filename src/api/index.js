import { Router } from 'express';
import userRoutes from './users/user_route.js';
import cardRoutes from './cards/card_route.js';
import matchHistoryRoutes from './matchHistory/matchHistory_route.js';
import emoteRoutes from './emotes/emote_route.js';
import shopRoutes from './api/shop/shop_route.js'

const router = Router();

router.use('/users', userRoutes);
router.use('/cards', cardRoutes);
router.use('/match-history', matchHistoryRoutes);
router.use('/emotes', emoteRoutes);
router.use('/shop', shopRoutes);

export default router;