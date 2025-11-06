import { Router } from 'express';
import { buyChest } from './shop_controller.js';
import { protect } from '../../middleware/auth_middleware.js';

const router = Router();

router.post('/buy-chest', protect, buyChest);

export default router;