import { Router } from 'express';
import {
    getUserMatchHistory,
    getMatchDetailsById,
    createMatchHistory
} from './matchHistory_controller.js';
import { protect } from '../../middleware/auth_middleware.js';

const router = Router();

// Todas as rotas de histórico exigem que o usuário esteja autenticado.
router.use(protect);

// Rota para o usuário logado buscar seu próprio histórico de partidas
router.get('/', getUserMatchHistory);

router.post('/', createMatchHistory);

// Rota para buscar os detalhes de uma partida específica pelo ID
router.get('/:id', getMatchDetailsById);

export default router;