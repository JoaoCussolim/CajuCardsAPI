import * as matchHistoryService from '../services/matchHistory_service.js';

export default function socketHandler(io) {
    // Ouve o evento principal de 'connection'
    io.on('connection', (socket) => {
        console.log(`Cliente conectado: ${socket.id}`);

        // --- Gerenciamento de Salas/Partidas ---
        socket.on('joinMatch', (matchId) => {
            socket.join(matchId); // Coloca o socket em uma "sala" para a partida
            console.log(`Socket ${socket.id} entrou na partida ${matchId}`);
        });

        // --- Eventos da Partida ---
        socket.on('playCard', (data) => {
            // Ex: data = { matchId: 'uuid-da-partida', card: {...}, position: 'x,y' }

            // 1. Validar a jogada (pode usar um serviço se houver lógica complexa)
            console.log(`Carta jogada na partida ${data.matchId}:`, data.card);

            // 2. Transmite a jogada para TODOS os outros clientes na mesma sala (partida)
            socket.to(data.matchId).emit('cardPlayed', { card: data.card, position: data.position });
        });

        // --- Fim da Partida ---
        socket.on('endMatch', async (result) => {
            // Ex: result = { matchId: '...', winnerId: '...', loserId: '...' }
            try {
                // Usa o serviço para salvar o resultado no banco de dados
                await matchHistoryService.createMatch(result);

                // Notifica todos na sala sobre o fim da partida
                io.to(result.matchId).emit('matchEnded', { winner: result.winnerId });
            } catch (error) {
                console.error('Erro ao salvar o resultado da partida:', error);
            }
        });

        // --- Desconexão ---
        socket.on('disconnect', () => {
            console.log(`Cliente desconectado: ${socket.id}`);
            // Aqui você pode adicionar lógica para lidar com um jogador que abandonou a partida
        });
    });
}