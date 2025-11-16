// models/matchHistory_model.js (CORRIGIDO)

import { supabase, supabaseAdmin } from '../services/supabaseClient_service.js';
// 1. IMPORTAR O supabaseAdmin

/**
 * @description Busca uma lista de partidas de um jogador específico.
 * @param {string} playerId - O UUID do jogador.
 * @returns {Promise<Array>}
 */
export const findHistoryByPlayerId = async (playerId) => {

    // 2. USAR supabaseAdmin para ignorar RLS
    const { data, error } = await supabaseAdmin
        .from('matchhistory')
        .select(`
            id,
            match_date,
            player1:players!player1_id ( id, username ),
            player2:players!player2_id ( id, username ),
            winner:players!winner_id ( id, username )
        `)
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .order('match_date', { ascending: false });

    if (error) {
        console.error('Erro na consulta de histórico (Admin):', error);
        throw error;
    }

    return data;
};

/**
 * @description Busca os detalhes completos de uma partida, incluindo as cartas usadas.
 * @param {string} matchId - O UUID da partida.
 * @returns {Promise<Object|null>}
 */
export const findMatchDetailsById = async (matchId) => {

    // 2. USAR supabaseAdmin aqui também
    const { data: matchData, error: matchError } = await supabaseAdmin
        .from('matchhistory')
        .select(`
            id,
            match_date,
            player1:players!player1_id ( id, username ),
            player2:players!player2_id ( id, username ),
            winner:players!winner_id ( id, username )
        `)
        .eq('id', matchId)
        .single();

    if (matchError) {
        if (matchError.code === 'PGRST116') return null; // Partida não encontrada
        throw matchError;
    }

    // A tabela 'matchhistorycards' também pode precisar do admin
    // 2. USAR supabaseAdmin aqui também
    const { data: cardsData, error: cardsError } = await supabaseAdmin
        .from('matchhistorycards')
        .select(`
            player_id,
            level_in_match,
            card:cards!card_id ( id, name, sprite_path ) 
        `)
        .eq('match_id', matchId);

    if (cardsError) {
        console.error('Erro ao buscar cartas da partida (Admin):', cardsError);
        throw cardsError;
    }

    // Combina os dados
    return { ...matchData, cards: cardsData };
};

export const create = async (matchData) => {
    const { data, error } = await supabaseAdmin
        .from('MatchHistory')
        .insert(matchData)
        .select()
        .single();

    if (error) throw error;
    return data;
};