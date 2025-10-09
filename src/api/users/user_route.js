import { Router } from 'express';
import {
    getAllUsers,
    getUserProfile,
    updateCurrentUser,
    getCurrentUserEmotes,
    addUserEmote
} from './user_controller.js';
import { protect, restrictTo } from '../../middleware/auth_middleware.js';

const router = Router();

// Todas as rotas abaixo desta linha exigem que o usuário esteja logado.
router.use(protect);

// ROTA DE ADMIN (mais específica)
router.get('/', restrictTo('admin'), getAllUsers);

// ROTAS DO UTILIZADOR LOGADO (mais específicas)
router.get('/me', getUserProfile);
router.patch('/me', updateCurrentUser);
router.get('/me/emotes', getCurrentUserEmotes);
router.post('/me/emotes', addUserEmote);

// ROTA COM PARÂMETRO (mais genérica - DEVE SER A ÚLTIMA)
router.get('/:id', getUserProfile);

export default router;