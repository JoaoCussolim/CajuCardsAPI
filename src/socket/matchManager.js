import { v4 as uuidv4 } from 'uuid';

// --- Constantes do Jogo (ajuste conforme necessário) ---
const GAME_TICK_RATE = 1000 / 10; // 10 ticks por segundo
const MAX_ENERGY = 10;
const ENERGY_REGEN_TICK = 1000; // 1 de energia por segundo
const TOWER_HEALTH = 3000;

class MatchManager {
    constructor(io, cardData) {
        this.io = io;
        this.activeMatches = new Map();
        this.gameLoopIntervals = new Map();
        this.cardData = new Map(cardData.map(card => [card.id, card]));
        console.log(`[Game] ${this.cardData.size} cartas carregadas na memória.`);
    }

    async createMatch(matchId, players) {
        const [player1Id, player2Id] = players.map(p => p.id);

        const initialState = {
            matchId: matchId,
            players: {
                [player1Id]: { id: player1Id, username: players[0].username, energy: 5, lastEnergyUpdate: Date.now() },
                [player2Id]: { id: player2Id, username: players[1].username, energy: 5, lastEnergyUpdate: Date.now() }
            },
            // As torres agora fazem parte do estado e são os alvos principais
            towers: {
                [player1Id]: { id: 'tower_' + player1Id, ownerId: player1Id, currentHealth: TOWER_HEALTH, position: { x: 250, y: 100 } }, // Posição fixa da torre 1
                [player2Id]: { id: 'tower_' + player2Id, ownerId: player2Id, currentHealth: TOWER_HEALTH, position: { x: 250, y: 900 } }  // Posição fixa da torre 2
            },
            // Bioma ativo para cada jogador, começa nulo
            biomes: {
                [player1Id]: null, // Ex: { cardId: '...', synergy: 'Primordial' }
                [player2Id]: null
            },
            board: [], // Unidades em campo
            gameOver: false,
            winnerId: null,
        };
        this.activeMatches.set(matchId, initialState);
        console.log(`[Game] Partida ${matchId} criada.`);
        this.startGameLoop(matchId);
    }

    startGameLoop(matchId) {
        if (this.gameLoopIntervals.has(matchId)) return;

        const intervalId = setInterval(async () => {
            // 1. ADICIONAR O 'try' AQUI
            try {
                const matchState = this.activeMatches.get(matchId);
                if (!matchState || matchState.gameOver) {
                    clearInterval(intervalId);
                    this.gameLoopIntervals.delete(matchId);
                    return;
                }

                let stateChanged = false;

                if (this.regenerateEnergy(matchState)) stateChanged = true;
                if (this.applySynergyBuffs(matchState)) stateChanged = true;
                if (this.processUnits(matchState)) stateChanged = true;
                if (this.applyBiomeRules(matchState)) stateChanged = true;

                const winnerId = this.checkWinCondition(matchState);
                if (winnerId) {
                    await this.endMatch(matchId, winnerId); // Continua com 'await'
                    return; // Para o loop
                }

                if (stateChanged) {
                    this.io.to(matchId).emit('gameStateUpdate', this.getSanitizedState(matchState));
                }

                // 2. ADICIONAR O 'catch' AQUI
            } catch (error) {
                console.error(`[GameLoop Error] Erro fatal no loop da partida ${matchId}:`, error.message, error);

                // Tenta notificar os jogadores que o servidor falhou
                this.io.to(matchId).emit('internalError', { message: 'Erro interno no servidor. A partida será finalizada.' });

                // Tenta finalizar a partida de forma segura para não travar
                try {
                    await this.endMatch(matchId, null); // Finaliza sem vencedor
                } catch (endErr) {
                    console.error(`[GameLoop Error] Falha ao tentar finalizar partida ${matchId} após erro:`, endErr.message);
                }
            }
        }, GAME_TICK_RATE);

        this.gameLoopIntervals.set(matchId, intervalId);
    }

    // --- LÓGICAS DO GAME LOOP ---

    regenerateEnergy(matchState) {
        // (Lógica da resposta anterior, continua a mesma)
        const now = Date.now();
        let changed = false;
        for (const playerId in matchState.players) {
            const player = matchState.players[playerId];
            const timePassed = now - player.lastEnergyUpdate;

            if (player.energy < MAX_ENERGY && timePassed >= ENERGY_REGEN_TICK) {
                const energyToAdd = Math.floor(timePassed / ENERGY_REGEN_TICK);
                player.energy = Math.min(player.energy + energyToAdd, MAX_ENERGY);
                player.lastEnergyUpdate += energyToAdd * ENERGY_REGEN_TICK;
                changed = true;
            }
            else if (player.energy >= MAX_ENERGY) {
                player.lastEnergyUpdate = now;
            }
        }
        return changed;
    }

    processUnits(matchState) {
        let stateChanged = false;
        const tickSeconds = GAME_TICK_RATE / 1000;

        for (const unit of matchState.board) {
            const cardInfo = this.cardData.get(unit.cardId);
            if (!cardInfo) continue;

            // Reduz cooldown de ataque
            if (unit.attackCooldown > 0) {
                unit.attackCooldown -= GAME_TICK_RATE;
            }

            // 1. Encontrar Alvo (Lógica principal aqui)
            const target = this.findTarget(unit, matchState);
            unit.targetId = target ? target.id : null; // target.id funciona para tropas e torres

            if (target) {
                const distance = this.calculateDistance(unit.position, target.position);
                const range = cardInfo.range || 50; // Use um atributo 'range' da sua carta

                // 2. Atacar se estiver no alcance e sem cooldown
                if (distance <= range && unit.attackCooldown <= 0) {
                    target.currentHealth -= cardInfo.damage;
                    unit.attackCooldown = (cardInfo.attack_speed || 1) * 1000; // Reinicia cooldown
                    stateChanged = true;

                    console.log(`[Combat] ${cardInfo.name} [${unit.instanceId}] atacou ${target.id}. Vida restante do alvo: ${target.currentHealth}`);

                    // Se o alvo for uma tropa e morrer, remove do tabuleiro
                    if (target.instanceId && target.currentHealth <= 0) {
                        matchState.board = matchState.board.filter(u => u.id !== target.id);
                        console.log(`[Combat] Unidade ${target.instanceId} destruída.`);
                    }
                }
                // 3. Mover se estiver fora de alcance
                else if (distance > range) {
                    const speed = cardInfo.speed || 20; // Atributo 'speed' da carta
                    const directionX = target.position.x - unit.position.x;
                    const directionY = target.position.y - unit.position.y;

                    // Normaliza o vetor de direção
                    const magnitude = Math.sqrt(directionX * directionX + directionY * directionY);

                    unit.position.x += (directionX / magnitude) * speed * tickSeconds;
                    unit.position.y += (directionY / magnitude) * speed * tickSeconds;
                    stateChanged = true;
                }
            }
        }
        return stateChanged;
    }

    applyBiomeRules(matchState) {
        let changed = false;
        const originalBoardSize = matchState.board.length;
        const [player1Id, player2Id] = Object.keys(matchState.players);

        // Bioma do Jogador 1 (afeta o lado do Jogador 1)
        const biome1 = matchState.biomes[player1Id];
        if (biome1) {
            // Regra: se o bioma existe, só cartas daquela sinergia podem estar no campo DO JOGADOR 1
            // Campo do Jogador 1: metade inferior do tabuleiro (y > 500)
            matchState.board = matchState.board.filter(unit => {
                const cardInfo = this.cardData.get(unit.cardId);
                if (unit.position.y > 500 && cardInfo.synergy !== biome1.synergy) {
                    console.log(`[Biome] Unidade ${cardInfo.name} [${unit.instanceId}] removida pelo bioma ${biome1.synergy} do jogador ${player1Id}.`);
                    return false; // Remove
                }
                return true; // Mantém
            });
        }

        // Bioma do Jogador 2 (afeta o lado do Jogador 2)
        const biome2 = matchState.biomes[player2Id];
        if (biome2) {
            // Campo do Jogador 2: metade superior do tabuleiro (y <= 500)
            matchState.board = matchState.board.filter(unit => {
                const cardInfo = this.cardData.get(unit.cardId);
                if (unit.position.y <= 500 && cardInfo.synergy !== biome2.synergy) {
                    console.log(`[Biome] Unidade ${cardInfo.name} [${unit.instanceId}] removida pelo bioma ${biome2.synergy} do jogador ${player2Id}.`);
                    return false; // Remove
                }
                return true; // Mantém
            });
        }

        if (matchState.board.length < originalBoardSize) {
            changed = true;
        }
        return changed;
    }

    checkWinCondition(matchState) {
        for (const towerId in matchState.towers) {
            if (matchState.towers[towerId].currentHealth <= 0) {
                // Retorna o ID do jogador OPOSTO como vencedor
                return Object.keys(matchState.players).find(id => id !== matchState.towers[towerId].ownerId);
            }
        }
        return null;
    }

    // --- LÓGICA DE ALVO E AÇÕES ---

    findTarget(unit, matchState) {
        const opponentId = Object.keys(matchState.players).find(id => id !== unit.ownerId);
        const enemyUnits = matchState.board.filter(u => u.ownerId === opponentId);
        const enemyTower = matchState.towers[opponentId];

        // Se existem tropas inimigas, encontre a mais próxima
        if (enemyUnits.length > 0) {
            let closestUnit = null;
            let minDistance = Infinity;

            for (const enemyUnit of enemyUnits) {
                const distance = this.calculateDistance(unit.position, enemyUnit.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestUnit = enemyUnit;
                }
            }
            return closestUnit;
        }

        // Se não há tropas inimigas, o alvo é a torre inimiga
        return enemyTower;
    }

    applySynergyBuffs(matchState) {
        let stateChanged = false;

        // Itera sobre cada jogador
        for (const playerId of Object.keys(matchState.players)) {
            const playerUnits = matchState.board.filter(u => u.ownerId === playerId);
            if (playerUnits.length === 0) continue;

            // 1. Contar sinergias ativas para este jogador
            const synergyCounts = new Map();
            playerUnits.forEach(unit => {
                const cardInfo = this.cardData.get(unit.cardId); // Pega info base da carta
                if (cardInfo && cardInfo.synergy) {
                    // Incrementa a contagem para aquela sinergia
                    synergyCounts.set(cardInfo.synergy, (synergyCounts.get(cardInfo.synergy) || 0) + 1);
                }
            });

            // 2. Aplicar os buffs baseados na contagem
            playerUnits.forEach(unit => {
                const cardInfo = this.cardData.get(unit.cardId);
                if (!cardInfo || !cardInfo.synergy) return; // Ignora se a carta não tiver sinergia

                const count = synergyCounts.get(cardInfo.synergy) || 0;
                let multiplier = 1.0; // Buff padrão (100%)

                if (count === 2) {
                    multiplier = 1.5; // +50%
                } else if (count >= 3) {
                    multiplier = 2.0; // +100%
                }

                // Calcula os novos stats
                const newMaxHealth = cardInfo.health * multiplier;
                const newDamage = cardInfo.damage * multiplier;
                const oldMaxHealth = unit.maxHealth; // Guarda o valor antigo

                // Se os stats mudaram, aplica e marca que o estado mudou
                if (unit.maxHealth !== newMaxHealth || unit.currentDamage !== newDamage) {
                    stateChanged = true;

                    unit.maxHealth = newMaxHealth;
                    unit.currentDamage = newDamage;

                    // Lógica para ajustar a vida atual:
                    if (newMaxHealth > oldMaxHealth) {
                        // Se ganhou buff, cura a diferença
                        unit.currentHealth += (newMaxHealth - oldMaxHealth);
                    } else if (newMaxHealth < oldMaxHealth) {
                        // Se perdeu buff (ex: uma tropa morreu),
                        // limita a vida atual à nova vida máxima
                        unit.currentHealth = Math.min(unit.currentHealth, newMaxHealth);
                    }
                }
            });
        }
        return stateChanged;
    }

    processPlayerAction(matchId, playerId, action) {
        const matchState = this.activeMatches.get(matchId);
        if (!matchState || matchState.gameOver) throw new Error("Partida não encontrada ou finalizada.");

        if (action.type === 'PLAY_CARD') {
            const card = this.cardData.get(action.cardId);
            const player = matchState.players[playerId];

            if (!card) throw new Error("Carta inválida.");
            if (player.energy < card.chestnut_cost) throw new Error("Energia insuficiente.");

            console.log(`[Game] ${player.username} jogou ${card.name} em (${action.positionX}, ${action.positionY}).`);
            player.energy -= card.chestnut_cost;

            if (card.type === 'Tropa') {
                const unitInstance = {
                    cardId: card.id,
                    ownerId: playerId,
                    currentHealth: card.health,
                    maxHealth: card.health,
                    currentDamage: card.damage,
                    position: { x: action.positionX, y: action.positionY },
                    targetId: null,
                    attackCooldown: 0,
                    id: uuidv4() // Adicionando id para consistência de alvo
                };
                matchState.board.push(unitInstance);
            } else if (card.type === 'Bioma') {
                // Define o bioma para o jogador que jogou a carta
                matchState.biomes[playerId] = { cardId: card.id, synergy: card.synergy };
                console.log(`[Biome] ${player.username} ativou o bioma ${card.synergy}.`);
            }
            // Adicionar lógica para 'Feitiço' aqui se necessário

            // O game loop vai emitir a atualização, então não precisamos fazer isso aqui.
            return true;
        }
        throw new Error(`Tipo de ação não reconhecido: ${action.type}`);
    }

    // --- FUNÇÕES AUXILIARES E DE GERENCIAMENTO ---

    async endMatch(matchId, winnerId) {
        const matchState = this.activeMatches.get(matchId);
        if (!matchState || matchState.gameOver) return; // Evita finalização dupla

        matchState.gameOver = true;
        matchState.winnerId = winnerId;

        const interval = this.gameLoopIntervals.get(matchId);
        if (interval) {
            clearInterval(interval);
            this.gameLoopIntervals.delete(matchId);
        }

        const winnerUsername = matchState.players[winnerId]?.username || 'Desconhecido';
        console.log(`[Game Over] Partida ${matchId}. Vencedor: ${winnerUsername}`);
        this.io.to(matchId).emit('gameOver', { winnerId, winnerUsername });

        // --- LÓGICA DE SALVAR NO BANCO DE DADOS ---
        try {
            const loserId = Object.keys(matchState.players).find(id => id !== winnerId);
            const player1Id = matchState.towers[Object.keys(matchState.towers)[0]].ownerId;
            const player2Id = matchState.towers[Object.keys(matchState.towers)[1]].ownerId;

            await MatchHistory.create({
                player1_id: player1Id,
                player2_id: player2Id,
                winner_id: winnerId,
                loser_id: loserId,
                match_duration: 0, // Você pode calcular isso se adicionar um timestamp no createMatch
                player1_tower_health: matchState.towers[player1Id].currentHealth,
                player2_tower_health: matchState.towers[player2Id].currentHealth,
            });
            console.log(`[DB] Histórico da partida ${matchId} salvo.`);
        } catch (error) {
            console.error(`[DB Error] Falha ao salvar histórico da partida ${matchId}:`, error.message);
        }
        // --- FIM DA LÓGICA DO DB ---

        setTimeout(() => this.activeMatches.delete(matchId), 10000); // Limpa da memória
    }

    calculateDistance(pos1, pos2) {
        return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
    }

    getSanitizedState(matchState) {
        // Remove dados que o cliente não precisa, como 'lastEnergyUpdate'
        const stateToSend = JSON.parse(JSON.stringify(matchState));
        for (const playerId in stateToSend.players) {
            delete stateToSend.players[playerId].lastEnergyUpdate;
        }
        return stateToSend;
    }
}

export default MatchManager;