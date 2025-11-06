import { supabase } from '../services/supabaseClient_service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import * as User from '../models/user_model.js';

/**
 * @description Middleware para proteger rotas. Verifica o token JWT do usuário.
 * 1. Pega o token do header 'Authorization'.
 * 2. Valida o token usando o Supabase.
 * 3. Se o token for válido, anexa o usuário ao objeto `req`.
 */
const protect = catchAsync(async (req, res, next) => {
    // 1. Verificar se o token existe
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(
            new ApiError('Você não está logado. Por favor, faça o login para obter acesso.', 401)
        );
    }

    // 2. Verificar se o token é válido
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
        // Se o Supabase retornar um erro (ex: token inválido, expirado), negamos o acesso.
        return next(new ApiError('Token inválido ou expirado. Por favor, faça o login novamente.', 401));
    }

    // 3. Se o token é válido e o usuário existe, anexa o usuário à requisição
    // O objeto 'user' do Supabase contém id, email, etc.
    req.user = user;

    // Passa para o próximo middleware ou controller
    next();
});


/**
 * @description Middleware para restringir o acesso a certas roles (ex: 'admin').
 * @param {...string} roles - As roles que têm permissão para acessar a rota.
 * @returns {function} Middleware do Express.
 *
 * @example
 * // Apenas usuários com a role 'admin' podem acessar:
 * router.post('/', protect, restrictTo('admin'), createCard);
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // A role do usuário geralmente é armazenada no 'app_metadata' ou 'user_metadata' no Supabase Auth.
        // Vamos assumir que está em 'app_metadata.role'.
        const userRole = req.user?.app_metadata?.role;

        if (!roles.includes(userRole)) {
            return next(
                new ApiError('Você não tem permissão para realizar esta ação.', 403) // 403 Forbidden
            );
        }

        next();
    };
};

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
        // O socket/index.js espera por 'socket.player.username'
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