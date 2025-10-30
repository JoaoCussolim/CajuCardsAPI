import { socketAuthMiddleware } from '../middleware/auth_middleware.js';

const waitingQueue = [];
// REMOVEMOS 'let matchManager;'

// CORREÇÃO: A função agora recebe 'io' e 'matchManager'
const socketHandler = (io, matchManager) => {

    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        console.log(`✅ Usuário conectado: ${socket.player.username} (ID: ${socket.id})`);

        // --- Lógica de Matchmaking (Com try...catch) ---
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

                    // Usa o matchManager que recebemos
                    await matchManager.createMatch(matchId, [player1Socket.player, player2Socket.player]);

                    io.to(matchId).emit('matchFound', {
                        matchId: matchId,
                        players: [player1Socket.player, player2Socket.player]
                    });
                    console.log(`[Game] Partida ${matchId} criada para ${player1Socket.player.username} e ${player2Socket.player.username}`);
                }
            } catch (error) {
                console.error(`[findMatch Error] ${error.message}`, error);
                socket.emit('actionInvalid', { message: 'Erro ao criar a partida. Tente novamente.' });
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

        // --- Manipulador de Desconexão (Com .catch) ---
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
                    
                    matchManager.endMatch(room).catch(err => {
                        console.error(`[endMatch Error] Erro ao finalizar partida ${room}: ${err.message}`);
                    });
                }
            });
        });
    });

    // REMOVEMOS o 'return httpServer;'
};

export default socketHandler;