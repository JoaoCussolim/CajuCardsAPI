import { Router } from 'express';
import {
    getAllCards,
    getCardById,
    createCard,
    updateCard,
    deleteCard
} from './card_controller.js';
import { protect, restrictTo } from '../../middleware/auth_middleware.js';

const router = Router();

// --- Rotas Públicas ---
// Qualquer pessoa pode listar as cartas.
router.get('/', getAllCards);
router.get('/:id', getCardById);


// --- Rotas Administrativas ---
// Apenas usuários autenticados ('protect') e com a role 'admin' ('restrictTo')
// podem criar, atualizar ou deletar cartas.
router.post('/', protect, restrictTo('admin'), createCard);
router.patch('/:id', protect, restrictTo('admin'), updateCard);
router.delete('/:id', protect, restrictTo('admin'), deleteCard);

export default router;