import { supabase, supabaseAdmin } from '../services/supabaseClient_service.js';

/**
 * @description Busca todos os emotes.
 * @returns {Promise<Array>}
 */
export const findAll = async () => {
    const { data, error } = await supabase.from('emotes').select('*');
    if (error) throw error;
    return data;
};

/**
 * @description Busca um emote pelo ID.
 * @param {string} id - O UUID do emote.
 * @returns {Promise<Object|null>}
 */
export const findById = async (id) => {
    const { data, error } = await supabase.from('emotes').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

/**
 * @description Cria um novo emote. (Ação de Admin)
 * @param {Object} emoteData - Dados do emote a ser criado.
 * @returns {Promise<Object>}
 */
export const create = async (emoteData) => {
    const { data, error } = await supabaseAdmin.from('emotes').insert(emoteData).select().single();
    if (error) throw error;
    return data;
};

/**
 * @description Atualiza um emote. (Ação de Admin)
 * @param {string} id - O UUID do emote.
 * @param {Object} updates - Campos a serem atualizados.
 * @returns {Promise<Object|null>}
 */
export const update = async (id, updates) => {
    const { data, error } = await supabaseAdmin.from('emotes').update(updates).eq('id', id).select().single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

/**
 * @description Remove um emote. (Ação de Admin)
 * @param {string} id - O UUID do emote.
 * @returns {Promise<boolean>}
 */
export const remove = async (id) => {
    const { error, count } = await supabaseAdmin.from('emotes').delete({ count: 'exact' }).eq('id', id);
    if (error) throw error;
    return count > 0;
};