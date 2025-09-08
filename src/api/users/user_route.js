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

// Rota para o usuário logado gerenciar seu próprio perfil
router.get('/me', getUserProfile); // Reutiliza getUserProfile para buscar o próprio usuário
router.patch('/me', updateCurrentUser);

// Rotas para o usuário logado gerenciar seus emotes
router.get('/me/emotes', getCurrentUserEmotes);
router.post('/me/emotes', addUserEmote);

// --- Rotas Administrativas ---
// Apenas administradores podem listar todos os usuários.
router.get('/', restrictTo('admin'), getAllUsers);

// Rota pública (dentro do 'protect') para ver o perfil de um usuário específico
// NOTA: Esta rota foi movida para o final para não conflitar com '/me'
router.get('/:id', getUserProfile);

export default router;