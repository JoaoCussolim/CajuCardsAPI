import { Server } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/auth_middleware.js';
import MatchManager from './matchManager.js';
import * as Card from '../models/card_model.js';
import { createServer } from 'http';

const waitingQueue = [];
let matchManager;

const socketHandler = (expressApp) => {
    const httpServer = createServer(expressApp);
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    Card.findAll().then(cardData => {
        matchManager = new MatchManager(io, cardData);
        console.log('[Socket] MatchManager inicializado.');
    }).catch(err => {
        console.error('[Socket] Erro fatal ao carregar dados das cartas:', err);
        process.exit(1);
    });

    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        console.log(`✅ Usuário conectado: ${socket.player.username} (ID: ${socket.id})`);

        // --- Lógica de Matchmaking (CORRIGIDA) ---
        // 1. Adicionado 'async' e 'try...catch'
        socket.on('findMatch', async () => {
            try {
                console.log(`[Queue] ${socket.player.username} está procurando partida.`);
                if (!waitingQueue.some(p => p.player.id === socket.player.id)) {
                    waitingQueue.push(socket);
                }

                if (waitingQueue.length >= 2) {
                    const player1Socket = waitingQueue.shift();
                    const player2Socket = waitingQueue.shift();

                    const matchId = `match_${player1Socket.id}_${player2Socket.id}`;

                    player1Socket.join(matchId);
                    player2Socket.join(matchId);

                    // 2. Adicionado 'await'
                    await matchManager.createMatch(matchId, [player1Socket.player, player2Socket.player]);

                    io.to(matchId).emit('matchFound', {
                        matchId: matchId,
                        players: [player1Socket.player, player2Socket.player]
                    });
                    console.log(`[Game] Partida ${matchId} criada para ${player1Socket.player.username} e ${player2Socket.player.username}`);
                }
            } catch (error) {
                // 3. Adicionado bloco 'catch'
                console.error(`[findMatch Error] ${error.message}`);
                socket.emit('actionInvalid', { message: 'Erro ao criar a partida.' });
            }
        });

        socket.on('cancelFindMatch', () => {
            const index = waitingQueue.findIndex(s => s.id === socket.id);
            if (index !== -1) {
                waitingQueue.splice(index, 1);
                console.log(`[Queue] ${socket.player.username} cancelou a busca.`);
            }
        });

        // --- EVENTOS DENTRO DA PARTIDA ---
        // (Este handler 'playCard' já estava correto)
        socket.on('playCard', async (data) => {
            try {
                const { matchId } = data;
                if (!matchId) {
                    throw new Error("Match ID não fornecido.");
                }

                await matchManager.processPlayerAction(matchId, socket.player.id, {
                    type: 'PLAY_CARD',
                    cardId: data.cardId,
                    positionX: data.positionX,
                    positionY: data.positionY
                });

            } catch (error) {
                console.error(`[Game Error] Partida ${data?.matchId || '?'}: ${error.message}`);
                socket.emit('actionInvalid', { message: error.message });
            }
        });

        // --- Manipulador de Desconexão (CORRIGIDO) ---
        socket.on('disconnect', (reason) => {
            console.log(`❌ Usuário desconectado: ${socket.player.username} (Motivo: ${reason})`);

            const index = waitingQueue.findIndex(s => s.id === socket.id);
            if (index !== -1) {
                waitingQueue.splice(index, 1);
                console.log(`[Queue] ${socket.player.username} removido da fila por desconexão.`);
            }

            socket.rooms.forEach(room => {
                if (room !== socket.id) {
                    console.log(`[Disconnect] ${socket.player.username} estava na partida ${room}. Finalizando.`);

                    socket.to(room).emit('opponentLeft', { playerId: socket.player.id });

                    // 4. Correção para 'endMatch'
                    // Como estamos em um forEach, não podemos usar await.
                    // Em vez disso, adicionamos .catch() à promise.
                    Promise.resolve(matchManager.endMatch(room))
                        .catch(err => {
                            console.error(`[endMatch Error] Erro ao finalizar partida ${room}: ${err.message}`);
                        });
                }
            });
        });
    });

    return httpServer;
};

export default socketHandler;