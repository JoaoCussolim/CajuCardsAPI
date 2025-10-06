/**
 * @description Classe para gerenciar o estado de todas as partidas ativas no servidor.
 */
class MatchManager {
    constructor(io, cardData) {
        this.io = io;
        this.activeMatches = new Map();

        // 1. Armazena os dados das cartas para acesso rápido, usando o ID da carta como chave.
        this.cardData = new Map(cardData.map(card => [card.id, card]));
        console.log(`[Game] ${this.cardData.size} cartas carregadas na memória.`);
    }

    createMatch(matchId, players) {
        const initialState = {
            matchId: matchId,
            players: {
                [players[0].id]: { ...players[0], health: 1000, energy: 5 },
                [players[1].id]: { ...players[1], health: 1000, energy: 5 }
            },
            board: [],
        };
        this.activeMatches.set(matchId, initialState);
        console.log(`[Game] Estado inicial criado para a partida ${matchId}`);
    }

    /**
     * @description Processa a ação de um jogador (ex: jogar uma carta).
     * @param {string} matchId - O ID da partida.
     * @param {string} playerId - O ID do jogador que realizou a ação.
     * @param {object} action - A ação a ser processada.
     */
    processPlayerAction(matchId, playerId, action) {
        const matchState = this.activeMatches.get(matchId);
        if (!matchState) throw new Error("Partida não encontrada.");

        if (action.type === 'PLAY_CARD') {
            // 2. Busca os dados da carta na memória do servidor.
            const card = this.cardData.get(action.cardId);
            if (!card) {
                throw new Error("Ação inválida: A carta jogada não existe.");
            }

            const playerState = matchState.players[playerId];

            // 3. Validação da Regra do Jogo (Exemplo: Custo de Energia)
            // Acessamos 'chestnut_cost' diretamente dos dados da carta que carregamos.
            if (playerState.energy < card.chestnut_cost) {
                throw new Error("Energia insuficiente para jogar esta carta.");
            }

            // Se a jogada for válida, atualize o estado do jogo.
            console.log(`[Game] ${playerState.username} jogou ${card.name} por ${card.chestnut_cost} de energia.`);

            // Subtrai o custo da energia do jogador
            playerState.energy -= card.chestnut_cost;

            // AQUI: Adicione a lógica para o que a carta faz
            // Ex: Adicionar uma tropa no 'board', causar dano na torre, etc.
            // if (card.type === 'tropa') {
            //     matchState.board.push({ ... });
            // } else if (card.type === 'bioma') {
            //     matchState.map = card.effect;
            // }

            // Atualiza o estado da partida no mapa
            this.activeMatches.set(matchId, matchState);
        }

        // Retorna o estado atualizado do jogo.
        return matchState;
    }

    endMatch(matchId) {
        this.activeMatches.delete(matchId);
        console.log(`[Game] Partida ${matchId} finalizada e removida da memória.`);
    }
}

export default MatchManager;