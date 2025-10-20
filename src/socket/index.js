import { Server } from 'socket.io';
import { socketAuthMiddleware } from '../middleware/auth_middleware.js';
import MatchManager from './matchManager.js';
import Card from '../models/card_model.js';
import { createServer } from 'http'; // Importar http para compatibilidade

const waitingQueue = [];
let matchManager;

// Função para inicializar e exportar o handler
const socketHandler = (expressApp) => {
    const httpServer = createServer(expressApp);
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    // Carrega os dados das cartas UMA VEZ
    Card.getAll().then(cardData => {
        // Inicializa o MatchManager com o 'io' e os dados das cartas
        matchManager = new MatchManager(io, cardData);
        console.log('[Socket] MatchManager inicializado.');
    }).catch(err => {
        console.error('[Socket] Erro fatal ao carregar dados das cartas:', err);
        process.exit(1); // Para o servidor se não conseguir carregar as cartas
    });

    // Middleware de autenticação para todas as conexões
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        console.log(`✅ Usuário conectado: ${socket.player.username} (ID: ${socket.id})`);

        // --- Lógica de Matchmaking ---
        socket.on('findMatch', () => {
            console.log(`[Queue] ${socket.player.username} está procurando partida.`);
            // Adiciona o socket (que contém socket.player) à fila
            if (!waitingQueue.some(p => p.player.id === socket.player.id)) {
                waitingQueue.push(socket);
            }

            // Se houver 2 ou mais jogadores, cria a partida
            if (waitingQueue.length >= 2) {
                const player1Socket = waitingQueue.shift();
                const player2Socket = waitingQueue.shift();

                const matchId = `match_${player1Socket.id}_${player2Socket.id}`;

                // Coloca ambos os sockets na mesma sala (room)
                player1Socket.join(matchId);
                player2Socket.join(matchId);

                // Cria o estado inicial da partida no MatchManager
                matchManager.createMatch(matchId, [player1Socket.player, player2Socket.player]);

                // Notifica os jogadores que a partida foi encontrada
                io.to(matchId).emit('matchFound', {
                    matchId: matchId,
                    players: [player1Socket.player, player2Socket.player]
                });
                console.log(`[Game] Partida ${matchId} criada para ${player1Socket.player.username} e ${player2Socket.player.username}`);
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

                // Apenas processa a ação. NÃO emite estado aqui.
                // O game loop no MatchManager é quem vai emitir o 'gameStateUpdate'
                await matchManager.processPlayerAction(matchId, socket.player.id, {
                    type: 'PLAY_CARD',
                    cardId: data.cardId,
                    positionX: data.positionX,
                    positionY: data.positionY
                });

                // #### LINHA REMOVIDA ####
                // const newGameState = matchManager.getMatchState(matchId);
                // io.to(matchId).emit('gameStateUpdate', newGameState);

            } catch (error) {
                console.error(`[Game Error] Partida ${data?.matchId || '?'}: ${error.message}`);
                // Envia o erro (ex: "Energia insuficiente") de volta APENAS para o jogador
                socket.emit('actionInvalid', { message: error.message });
            }
        });

        // --- Manipulador de Desconexão ---
        socket.on('disconnect', (reason) => {
            console.log(`❌ Usuário desconectado: ${socket.player.username} (Motivo: ${reason})`);

            // Remove da fila de espera se estiver lá
            const index = waitingQueue.findIndex(s => s.id === socket.id);
            if (index !== -1) {
                waitingQueue.splice(index, 1);
                console.log(`[Queue] ${socket.player.username} removido da fila por desconexão.`);
            }

            // Notifica o oponente e finaliza a partida se estiver em uma
            socket.rooms.forEach(room => {
                if (room !== socket.id) { // Para cada sala que NÃO seja a sala pessoal
                    console.log(`[Disconnect] ${socket.player.username} estava na partida ${room}. Finalizando.`);

                    // Notifica os outros na sala que o jogador saiu
                    socket.to(room).emit('opponentLeft', { playerId: socket.player.id });

                    // #### LINHA ADICIONADA ####
                    // Informa o MatchManager para finalizar a partida, parar o loop e declarar vencedor (se houver)
                    // (O endMatch vai descobrir quem é o vencedor)
                    matchManager.endMatch(room);
                }
            });
        });
    });

    // Retorna o httpServer para o index.js principal poder dar o .listen()
    return httpServer;
};

export default socketHandler;