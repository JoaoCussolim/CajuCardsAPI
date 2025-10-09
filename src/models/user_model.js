import { supabase, supabaseAdmin } from '../services/supabaseClient_service.js';

/**
 * @description Busca todos os jogadores (perfis).
 * @returns {Promise<Array>}
 */
export const findAll = async () => {
    const { data, error } = await supabase.from('players').select('id, username, cashew_coins');
    if (error) throw error;
    return data;
};

/**
 * @description Busca um jogador pelo ID.
 * @param {string} id - O UUID do jogador.
 * @returns {Promise<Object|null>}
 */
export const findById = async (id) => {
    const { data, error } = await supabaseAdmin
        .from('players')
        .select('id, username, cashew_coins')
        .eq('id', id)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

/**
 * @description Atualiza os dados de um jogador.
 * @param {string} id - O UUID do jogador.
 * @param {Object} updates - Os campos a serem atualizados.
 * @returns {Promise<Object>}
 */
export const update = async (id, updates) => {
    const { data, error } = await supabaseAdmin
        .from('players')
        .update(updates)
        .eq('id', id)
        .select('id, username, cashew_coins')
        .single();
    if (error) throw error;
    return data;
};

/**
 * @description Busca todos os emotes de um jogador específico.
 * @param {string} playerId - O UUID do jogador.
 * @returns {Promise<Array>}
 */
export const findEmotesByPlayerId = async (playerId) => {
    const { data, error } = await supabase
        .from('playeremotes')
        .select(`
            emote_id,
            emotes ( name, sprite_path )
        `)
        .eq('player_id', playerId);

    if (error) throw error;
    // Formata a resposta para ser uma lista de emotes
    return data.map(item => ({
        id: item.emote_id,
        name: item.emotes.name,
        sprite_path: item.emotes.sprite_path
    }));
};

/**
 * @description Adiciona um emote a um jogador (cria a relação).
 * @param {string} playerId - O UUID do jogador.
 * @param {string} emoteId - O UUID do emote.
 * @returns {Promise<Object>}
 */
export const addEmoteToPlayer = async (playerId, emoteId) => {
    const { data, error } = await supabaseAdmin
        .from('playeremotes')
        .insert({ player_id: playerId, emote_id: emoteId })
        .select()
        .single();

    if (error) {
        // Trata erro de violação de chave primária (emote já existe para o jogador)
        if (error.code === '23505') {
            throw new Error('O jogador já possui este emote.');
        }
        throw error;
    }
    return data;
};