import { supabase } from '../services/supabaseClient_service.js';
import ApiError from '../utils/ApiError.js';
import { v4 as uuidv4 } from 'uuid';

// A fila de espera é gerenciada aqui, no nível do socket.
const waitingQueue = [];

/**
 * @description Inicializa e anexa todos os manipuladores de eventos do Socket.IO ao servidor.
 * @param {import('socket.io').Server} io - A instância do servidor Socket.IO.
 * @param {import('../game/MatchManager.js').default} matchManager - A instância do gerenciador de partidas.
 */
const socketHandler = (io, matchManager) => {
    // --- Middleware de Autenticação ---
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new ApiError('Authentication error: Token not provided.', 401));
            }

            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error || !user) {
                return next(new ApiError('Authentication error: Invalid or expired token.', 401));
            }

            socket.player = {
                id: user.id,
                username: user.user_metadata.username,
            };

            next();
        } catch (err) {
            console.error('Erro no middleware do socket:', err);
            next(new ApiError('Internal server error during socket authentication.', 500));
        }
    });

    // --- Manipulador Principal de Conexões ---
    io.on('connection', (socket) => {
        console.log(`✅ Usuário conectado: ${socket.player.username} (ID: ${socket.id})`);

        // --- LÓGICA DE MATCHMAKING ---
        socket.on('findMatch', () => {
            if (waitingQueue.some(p => p.player.id === socket.player.id)) return;

            console.log(`[Queue] ${socket.player.username} entrou na fila.`);
            waitingQueue.push(socket);

            if (waitingQueue.length >= 2) {
                const player1Socket = waitingQueue.shift();
                const player2Socket = waitingQueue.shift();
                const matchId = uuidv4();

                player1Socket.join(matchId);
                player2Socket.join(matchId);

                // Delega a criação do estado inicial do jogo para o MatchManager
                matchManager.createMatch(matchId, [player1Socket.player, player2Socket.player]);

                console.log(`[Match Found] Partida ${matchId} criada para ${player1Socket.player.username} vs ${player2Socket.player.username}`);

                // Envia o evento para os jogadores com os dados da partida
                io.to(matchId).emit('matchFound', {
                    matchId: matchId,
                    players: [player1Socket.player, player2Socket.player],
                });
            } else {
                socket.emit('waitingForOpponent');
            }
        });

        socket.on('cancelFindMatch', () => {
            const index = waitingQueue.findIndex(s => s.id === socket.id);
            if (index !== -1) {
                waitingQueue.splice(index, 1);
                console.log(`[Queue] ${socket.player.username} saiu da fila.`);
                socket.emit('matchmakingCancelled');
            }
        });

        // --- EVENTOS DENTRO DA PARTIDA ---
        socket.on('playCard', async (data) => {
            try {
                const { matchId, cardId, positionX, positionY } = data;

                // Delega o processamento da ação para o MatchManager
                const newGameState = await matchManager.processPlayerAction(matchId, socket.player.id, {
                    type: 'PLAY_CARD',
                    cardId,
                    positionX,
                    positionY
                });

                // Envia o novo estado do jogo para todos na sala
                io.to(matchId).emit('gameStateUpdate', newGameState);

            } catch (error) {
                // Se o MatchManager retornar um erro (ex: energia insuficiente),
                // notifica apenas o jogador que tentou a ação.
                console.error(`[Game Error] Partida ${data.matchId}: ${error.message}`);
                socket.emit('actionInvalid', { message: error.message });
            }
        });

        // --- Manipulador de Desconexão ---
        socket.on('disconnect', (reason) => {
            console.log(`❌ Usuário desconectado: ${socket.player.username} (Motivo: ${reason})`);

            const index = waitingQueue.findIndex(s => s.id === socket.id);
            if (index !== -1) {
                waitingQueue.splice(index, 1);
            }

            // Notifica o oponente se a desconexão ocorrer durante uma partida
            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.to(room).emit('opponentLeft', { playerId: socket.player.id });
                    // Informa o MatchManager para limpar a partida da memória
                    matchManager.endMatch(room);
                }
            });
        });
    });
};

export default socketHandler;