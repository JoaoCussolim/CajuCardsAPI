import { supabase, supabaseAdmin } from '../services/supabaseClient_service.js';

/**
 * @description Busca todas as cartas no banco de dados.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de cartas.
 */
export const findAll = async () => {
    const { data, error } = await supabase.from('cards').select('*');
    if (error) throw error;
    return data;
};

/**
 * @description Busca uma carta específica pelo seu ID.
 * @param {string} id - O UUID da carta.
 * @returns {Promise<Object|null>} Uma promessa que resolve para o objeto da carta ou null se não for encontrada.
 */
export const findById = async (id) => {
    const { data, error } = await supabase.from('cards').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') { // PGRST116 = "A query retornou 0 linhas" que não é um erro para nós
        throw error;
    }
    return data;
};

/**
 * @description Cria uma nova carta no banco de dados. (Ação de Admin)
 * @param {Object} cardData - Os dados da carta a ser criada.
 * @returns {Promise<Object>} Uma promessa que resolve para a carta recém-criada.
 */
export const create = async (cardData) => {
    const { data, error } = await supabaseAdmin
        .from('cards')
        .insert(cardData)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * @description Atualiza uma carta existente no banco de dados. (Ação de Admin)
 * @param {string} id - O UUID da carta a ser atualizada.
 * @param {Object} updates - Um objeto com os campos a serem atualizados.
 * @returns {Promise<Object|null>} Uma promessa que resolve para a carta atualizada ou null se não encontrada.
 */
export const update = async (id, updates) => {
    const { data, error } = await supabaseAdmin
        .from('cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    return data;
};

/**
 * @description Remove uma carta do banco de dados. (Ação de Admin)
 * @param {string} id - O UUID da carta a ser removida.
 * @returns {Promise<boolean>} Uma promessa que resolve para true se a deleção foi bem-sucedida, false caso contrário.
 */
export const remove = async (id) => {
    const { error, count } = await supabaseAdmin.from('cards').delete({ count: 'exact' }).eq('id', id);

    if (error) throw error;
    return count > 0;
};