import * as cardModel from '../../models/card_model.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

/**
 * @description Buscar todas as cartas.
 * @route GET /api/cards
 */
export const getAllCards = catchAsync(async (req, res, next) => {
    const cards = await cardModel.findAll();
    res.status(200).json({
        status: 'success',
        results: cards.length,
        data: {
            cards,
        },
    });
});

/**
 * @description Buscar uma carta específica pelo ID.
 * @route GET /api/cards/:id
 */
export const getCardById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const card = await cardModel.findById(id);

    if (!card) {
        return next(new ApiError('Nenhuma carta encontrada com este ID.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            card,
        },
    });
});

/**
 * @description Criar uma nova carta. (Requer privilégios de administrador)
 * @route POST /api/cards
 */
export const createCard = catchAsync(async (req, res, next) => {
    // req.body deve conter todos os campos da tabela 'cards'
    // Ex: { name, description, type, synergy, rarity, chestnut_cost, sprite_path, health, damage }
    const newCard = await cardModel.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            card: newCard,
        },
    });
});

/**
 * @description Atualizar uma carta existente. (Requer privilégios de administrador)
 * @route PATCH /api/cards/:id
 */
export const updateCard = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updates = req.body;

    const updatedCard = await cardModel.update(id, updates);

    if (!updatedCard) {
        return next(new ApiError('Nenhuma carta encontrada com este ID para atualizar.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            card: updatedCard,
        },
    });
});

/**
 * @description Deletar uma carta. (Requer privilégios de administrador)
 * @route DELETE /api/cards/:id
 */
export const deleteCard = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await cardModel.remove(id);

    if (!result) {
        return next(new ApiError('Nenhuma carta encontrada com este ID para deletar.', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});