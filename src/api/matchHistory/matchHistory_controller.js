import * as matchHistoryModel from '../../models/matchHistory_model.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

/**
 * @description Busca o histórico de partidas do usuário logado.
 * @route GET /api/match-history
 */
export const getUserMatchHistory = catchAsync(async (req, res, next) => {
    console.log('--- [MATCH CONTROLLER] INICIADO ---');
    
    // Este é o ID do perfil do jogador que veio do middleware
    const playerId = req.user.id;
    
    console.log(`[MATCH CONTROLLER] Buscando histórico para o Player ID: ${playerId}`);

    // Executa a consulta
    const history = await matchHistoryModel.findHistoryByPlayerId(playerId);

    console.log(`[MATCH CONTROLLER] Consulta ao BD retornou: ${history.length} partidas.`);
    console.log('[MATCH CONTROLLER] Dados brutos da consulta:', history);

    console.log('--- [MATCH CONTROLLER] CONCLUÍDO ---');

    res.status(200).json({
        status: 'success',
        results: history.length,
        data: {
            matches: history,
        },
    });
});

// ... (resto do arquivo, getMatchDetailsById)

/**
 * @description Busca os detalhes completos de uma partida específica.
 * @route GET /api/match-history/:id
 */
export const getMatchDetailsById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const matchDetails = await matchHistoryModel.findMatchDetailsById(id);

    if (!matchDetails) {
        return next(new ApiError('Nenhuma partida encontrada com este ID.', 404));
    }

    // Opcional: Verificar se o usuário logado participou da partida antes de retornar os dados
    // if (matchDetails.player1_id !== req.user.id && matchDetails.player2_id !== req.user.id) {
    //     return next(new ApiError('Você não tem permissão para ver os detalhes desta partida.', 403));
    // }

    res.status(200).json({
        status: 'success',
        data: {
            match: matchDetails,
        },
    });
});