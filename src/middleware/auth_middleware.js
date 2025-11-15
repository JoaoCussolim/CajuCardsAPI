// middleware/auth_middleware.js

import { supabase } from '../services/supabaseClient_service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import * as User from '../models/user_model.js'; // Este import já existia

/**
 * @description Middleware para proteger rotas. Verifica o token JWT do usuário.
 * 1. Pega o token do header 'Authorization'.
 * 2. Valida o token usando o Supabase.
 * 3. [MODIFICADO] Busca o perfil do JOGADOR associado.
 * 4. [MODIFICADO] Anexa o JOGADOR ao objeto `req`.
 */
const protect = catchAsync(async (req, res, next) => {
    // 1. Verificar se o token existe (lógica original)
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(
            new ApiError('Você não está logado. Por favor, faça o login para obter acesso.', 401)
        );
    }

    // 2. Verificar se o token é válido (lógica original)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
        // Se o Supabase retornar um erro (ex: token inválido, expirado), negamos o acesso.
        return next(new ApiError('Token inválido ou expirado. Por favor, faça o login novamente.', 401));
    }

    // 3. [MODIFICADO] Buscar o PERFIL DO JOGADOR usando o ID de autenticação
    // O 'user.id' é o ID da tabela 'auth.users'
    // Precisamos encontrar o perfil correspondente na tabela 'players'
    // Estamos usando a mesma lógica do seu socketAuthMiddleware
    const playerData = await User.findById(user.id); 

    if (!playerData) {
        return next(new ApiError('Perfil de jogador não encontrado para este usuário.', 404));
    }

    // 4. [MODIFICADO] Anexar o *perfil do jogador* (playerData) ao req.user
    // Agora, req.user conterá o ID da tabela 'players', username, etc.
    req.user = playerData;

    // Passa para o próximo middleware ou controller
    next();
});


/**
 * @description Middleware para restringir o acesso a certas roles (ex: 'admin').
 * (Função original - sem modificações)
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        const userRole = req.user?.app_metadata?.role;

        if (!roles.includes(userRole)) {
            return next(
                new ApiError('Você não tem permissão para realizar esta ação.', 403) // 403 Forbidden
            );
        }

        next();
    };
};

/**
 * @description Middleware de autenticação para Sockets
 * (Função original - sem modificações)
 */
const socketAuthMiddleware = async (socket, next) => {
    try {
        // 1. Pega o token
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new ApiError('Token não fornecido. Conexão recusada.', 401));
        }

        // 2. Valida o token no Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return next(new ApiError('Token inválido ou expirado. Conexão recusada.', 401));
        }

        // 3. Busca os dados do perfil (jogador) usando o user_model
        const playerData = await User.findById(user.id);

        if (!playerData) {
            return next(new ApiError('Perfil de jogador não encontrado.', 404));
        }

        // 4. Anexa os dados do JOGADOR ao socket
        socket.player = playerData;

        // 5. Sucesso, permite a conexão
        next();

    } catch (err) {
        console.error('[Socket Auth] Erro no middleware:', err.message);
        // Passa o erro para o socket.io
        next(new ApiError(err.message || 'Erro interno de autenticação.', 500)); 
    }
};

export { protect, restrictTo, socketAuthMiddleware };