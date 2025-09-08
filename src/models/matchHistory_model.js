import { supabase } from '../services/supabaseClient_service.js';

/**
 * @description Busca uma lista de partidas de um jogador específico.
 * @param {string} playerId - O UUID do jogador.
 * @returns {Promise<Array>}
 */
export const findHistoryByPlayerId = async (playerId) => {
    const { data, error } = await supabase
        .from('matchhistory')
        .select(`
            id,
            match_date,
            player1:players!matchhistory_player1_id_fkey ( id, username ),
            player2:players!matchhistory_player2_id_fkey ( id, username ),
            winner:players!matchhistory_winner_id_fkey ( id, username )
        `)
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .order('match_date', { ascending: false }); // Ordena das mais recentes para as mais antigas

    if (error) throw error;
    return data;
};

/**
 * @description Busca os detalhes completos de uma partida, incluindo as cartas usadas.
 * @param {string} matchId - O UUID da partida.
 * @returns {Promise<Object|null>}
 */
export const findMatchDetailsById = async (matchId) => {
    const { data: matchData, error: matchError } = await supabase
        .from('matchhistory')
        .select(`
            id,
            match_date,
            player1:players!matchhistory_player1_id_fkey ( id, username ),
            player2:players!matchhistory_player2_id_fkey ( id, username ),
            winner:players!matchhistory_winner_id_fkey ( id, username )
        `)
        .eq('id', matchId)
        .single();

    if (matchError) {
        if (matchError.code === 'PGRST116') return null; // Partida não encontrada
        throw matchError;
    }

    const { data: cardsData, error: cardsError } = await supabase
        .from('matchhistorycards')
        .select(`
            player_id,
            level_in_match,
            card:cards ( id, name, sprite_path )
        `)
        .eq('match_id', matchId);

    if (cardsError) throw cardsError;

    // Estrutura o resultado final
    return {
        ...matchData,
        cards_used: cardsData,
    };
};