import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';

// Validação para garantir que as variáveis de ambiente foram carregadas
if (!config.supabase.url || !config.supabase.anonKey || !config.supabase.serviceRoleKey) {
    throw new Error(
        'Variáveis de ambiente do Supabase não configuradas. Verifique seu arquivo .env'
    );
}

/**
 * @description Cliente Supabase padrão (público).
 * Utiliza a chave anônima (anon key) e respeita as políticas de RLS.
 * Ideal para operações do ponto de vista do usuário logado.
 */
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * @description Cliente Supabase com privilégios de administrador.
 * Utiliza a chave de serviço (service_role key) e ignora TODAS as políticas de RLS.
 * Use com cuidado e apenas no backend para tarefas administrativas.
 */
const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

export { supabase, supabaseAdmin };