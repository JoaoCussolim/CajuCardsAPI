// models/matchHistory_model.js (CORRIGIDO E SIMPLIFICADO)

import { supabase } from '../services/supabaseClient_service.js';

/**
 * @description Busca uma lista de partidas de um jogador específico.
 * @param {string} playerId - O UUID do jogador.
 * @returns {Promise<Array>}
 */
export const findHistoryByPlayerId = async (playerId) => {
    
    // ============ AQUI ESTÁ A MUDANÇA ============
    // Trocamos a sintaxe 'players!constraint_name' pela sintaxe
    // 'players!coluna_de_chave_estrangeira'.
    //
    // player1:players!player1_id significa:
    // "Crie o apelido 'player1' fazendo join com 'players' usando a coluna 'player1_id'"
    //
    // Esta sintaxe é muito mais robusta e não quebra se o nome da
    // constraint mudar.
    // ============================================

    const { data, error } = await supabase
        .from('matchhistory')
        .select(`
            id,
            match_date,
            player1:players!player1_id ( id, username ),
            player2:players!player2_id ( id, username ),
            winner:players!winner_id ( id, username )
        `)
        .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
        .order('match_date', { ascending: false }); // Ordena das mais recentes para as mais antigas

    if (error) {
        // Se ainda houver um erro, ele aparecerá no console do seu servidor Node.js
        console.error('Erro na consulta de histórico:', error);
        throw error;
    }

    // Isso deve agora retornar os dados
    return data;
};

/**
 * @description Busca os detalhes completos de uma partida, incluindo as cartas usadas.
 * @param {string} matchId - O UUID da partida.
 * @returns {Promise<Object|null>}
 */
export const findMatchDetailsById = async (matchId) => {
    // Também aplicamos a correção aqui
    const { data: matchData, error: matchError } = await supabase
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

    const { data: cardsData, error: cardsError } = await supabase
        .from('matchhistorycards')
        .select(`
            player_id,
            level_in_match,
            card:cards!card_id ( id, name, sprite_path ) 
        `)
        .eq('match_id', matchId);

    if (cardsError) {
        console.error('Erro ao buscar cartas da partida:', cardsError);
        throw cardsError;
    }

    // Combina os dados
    return { ...matchData, cards: cardsData };
};