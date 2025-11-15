// middleware/auth_middleware.js

import { supabase } from '../services/supabaseClient_service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import * as User from '../models/user_model.js';

/**
 * @description Middleware para proteger rotas. Verifica o token JWT do usuário.
 * 1. Pega o token do header 'Authorization'.
 * 2. Valida o token usando o Supabase.
 * 3. [CORRIGIDO] Busca o perfil do JOGADOR correspondente.
 * 4. [CORRIGIDO] Anexa o JOGADOR ao objeto `req`.
 */
const protect = catchAsync(async (req, res, next) => {
    // Adicionado log de depuração
    console.log('\n--- [AUTH MIDDLEWARE] INICIADO ---');
    
    // 1. Verificar se o token existe (lógica original)
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        console.log('[AUTH MIDDLEWARE] ERRO: Token não encontrado.');
        return next(
            new ApiError('Você não está logado. Por favor, faça o login para obter acesso.', 401)
        );
    }

    // 2. Verificar se o token é válido (lógica original)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
        console.log('[AUTH MIDDLEWARE] ERRO: Token inválido ou expirado.');
        return next(new ApiError('Token inválido ou expirado. Por favor, faça o login novamente.', 401));
    }
    
    // Adicionado log de depuração
    console.log(`[AUTH MIDDLEWARE] ID de Autenticação (user.id): ${user.id}`);

    // 3. [CORREÇÃO] Buscar o PERFIL DO JOGADOR usando o ID de autenticação
    // Esta é a lógica que faltava, e que o 'socketAuthMiddleware' já fazia.
    const playerData = await User.findById(user.id); 

    if (!playerData) {
        console.log('[AUTH MIDDLEWARE] ERRO: Perfil de jogador não encontrado (playerData).');
        return next(new ApiError('Perfil de jogador não encontrado para este usuário.', 404));
    }

    // Adicionado log de depuração
    console.log('[AUTH MIDDLEWARE] Perfil Encontrado (playerData):', playerData);

    // 4. [CORRIGIDO] Anexar o *perfil do jogador* (playerData) ao req.user
    // Agora, req.user conterá { id, username, cashew_coins }
    req.user = playerData;

    // Adicionado log de depuração
    console.log('--- [AUTH MIDDLEWARE] CONCLUÍDO ---\n');
    next();
});


/**
 * @description Middleware para restringir o acesso a certas roles
 * (Função original - sem modificações)
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user?.app_metadata?.role;

        if (!roles.includes(userRole)) {
            return next(
                new ApiError('Você não tem permissão para realizar esta ação.', 403)
            );
        }

        next();
    };
};

/**
 * @description Middleware de autenticação para Sockets
 * (Função original - já estava correta)
 */
const socketAuthMiddleware = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new ApiError('Token não fornecido. Conexão recusada.', 401));
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return next(new ApiError('Token inválido ou expirado. Conexão recusada.', 401));
        }

        // 3. Busca os dados do perfil (jogador)
        const playerData = await User.findById(user.id);
        if (!playerData) {
            return next(new ApiError('Perfil de jogador não encontrado.', 404));
        }

        // 4. Anexa os dados do JOGADOR ao socket
        socket.player = playerData;
        next();

    } catch (err) {
        console.error('[Socket Auth] Erro no middleware:', err.message);
        next(new ApiError(err.message || 'Erro interno de autenticação.', 500)); 
    }
};

export { protect, restrictTo, socketAuthMiddleware };