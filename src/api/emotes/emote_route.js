import { Router } from 'express';
import {
    getAllEmotes,
    getEmoteById,
    createEmote,
    updateEmote,
    deleteEmote
} from './emote_controller.js';
import { protect, restrictTo } from '../../middleware/auth_middleware.js';

const router = Router();

// Rotas públicas para visualização de emotes
router.get('/', getAllEmotes);
router.get('/:id', getEmoteById);

// Rotas que exigem autenticação de administrador
router.post('/', protect, restrictTo('admin'), createEmote);
router.patch('/:id', protect, restrictTo('admin'), updateEmote);
router.delete('/:id', protect, restrictTo('admin'), deleteEmote);

export default router;