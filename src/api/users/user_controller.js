import * as userModel from '../../models/user_model.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

/**
 * @description Lista todos os usuários (apenas para Admins).
 * @route GET /api/users
 */
export const getAllUsers = catchAsync(async (req, res, next) => {
    const users = await userModel.findAll();
    res.status(200).json({
        status: 'success',
        results: users.length,
        data: { users },
    });
});

/**
 * @description Busca o perfil de um usuário. Se o ID não for fornecido,
 * busca o perfil do usuário atualmente logado.
 * @route GET /api/users/me ou GET /api/users/:id
 */
export const getUserProfile = catchAsync(async (req, res, next) => {
    // Se não houver ID nos parâmetros, usa o ID do usuário logado (da rota /me)
    const idToFetch = req.params.id || req.user.id;
    const user = await userModel.findById(idToFetch);

    if (!user) {
        return next(new ApiError('Nenhum usuário encontrado com este ID.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { user },
    });
});

/**
 * @description Permite que o usuário logado atualize seus próprios dados.
 * @route PATCH /api/users/me
 */
export const updateCurrentUser = catchAsync(async (req, res, next) => {
    // Permite apenas a atualização de campos não sensíveis (ex: username)
    const allowedUpdates = { username: req.body.username, cashew_coins: req.body.cashew_coins };

    const updatedUser = await userModel.update(req.user.id, allowedUpdates);

    res.status(200).json({
        status: 'success',
        data: { user: updatedUser },
    });
});

/**
 * @description Adiciona 1000 moedas ao usuário logado (recompensa de vitória).
 * @route POST /api/users/me/claim-victory
 */
export const claimVictoryReward = catchAsync(async (req, res, next) => {
    const victoryAmount = 1000;
    const playerId = req.user.id;

    const currentCoins = req.user.cashew_coins;
    const newTotalCoins = currentCoins + victoryAmount;
    const updatedPlayer = await userModel.update(playerId, { 
        cashew_coins: newTotalCoins 
    });

    res.status(200).json({
        status: 'success',
        data: { 
            user: updatedPlayer 
        },
    });
});

/**
 * @description Busca os emotes do usuário logado.
 * @route GET /api/users/me/emotes
 */
export const getCurrentUserEmotes = catchAsync(async (req, res, next) => {
    const emotes = await userModel.findEmotesByPlayerId(req.user.id);
    res.status(200).json({
        status: 'success',
        results: emotes.length,
        data: { emotes },
    });
});

/**
 * @description Adiciona um emote à coleção do usuário logado.
 * @route POST /api/users/me/emotes
 */
export const addUserEmote = catchAsync(async (req, res, next) => {
    const { emote_id } = req.body;
    if (!emote_id) {
        return next(new ApiError('O ID do emote é obrigatório.', 400));
    }

    const newEmoteLink = await userModel.addEmoteToPlayer(req.user.id, emote_id);

    res.status(201).json({
        status: 'success',
        data: newEmoteLink,
    });
});