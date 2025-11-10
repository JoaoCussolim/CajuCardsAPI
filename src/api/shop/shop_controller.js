import * as userModel from '../../models/user_model.js';
import * as emoteModel from '../../models/emote_model.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

const CHEST_PRICES = {
    'Baú Mercúrio': 200,
    'Baú Plutônio': 300,
    'Baú Urânio': 400
};

/**
 * @description Compra um baú, debita moedas e sorteia um emote.
 * @route POST /api/shop/buy-chest
 */
export const buyChest = catchAsync(async (req, res, next) => {
    
    // --- INÍCIO DA DEPURAÇÃO ---
    console.log('[buyChest] Início da função.');
    
    // 1. Pega o ID do usuário e o nome do baú
    const { chest_name } = req.body;
    const userId = req.user.id; // Isso vem do 'protect'
    console.log(`[buyChest] Usuário ID: ${userId}, Baú: ${chest_name}`);

    // 2. Verifica se é um baú válido e pega o preço
    const price = CHEST_PRICES[chest_name];
    if (!price) {
        console.error('[buyChest] ERRO: Tipo de baú inválido.');
        return next(new ApiError('Tipo de baú inválido.', 400));
    }
    console.log(`[buyChest] Preço do baú: ${price}`);

    // 3. Busca o jogador
    console.log('[buyChest] Buscando jogador no userModel.findById...');
    const player = await userModel.findById(userId);

    // 4. VERIFICAÇÃO OBRIGATÓRIA
    if (!player) {
        console.error(`[buyChest] ERRO: Jogador não encontrado com ID: ${userId}`);
        return next(new ApiError('Perfil do jogador não encontrado na base de dados.', 404));
    }
    console.log(`[buyChest] Jogador encontrado. Moedas atuais: ${player.cashew_coins}`);

    // 5. Verifica se ele tem moedas
    if (player.cashew_coins < price) {
        console.warn('[buyChest] ERRO: Moedas insuficientes.');
        return next(new ApiError('Moedas insuficientes.', 402)); // 402 = Payment Required
    }
    console.log('[buyChest] Verificação de moedas OK.');

    // 6. Sorteia um emote
    console.log('[buyChest] Buscando emotes no emoteModel.findAll...');
    const allEmotes = await emoteModel.findAll();
    if (!allEmotes || allEmotes.length === 0) {
        console.error('[buyChest] ERRO: Nenhum emote encontrado no banco.');
        return next(new ApiError('Nenhum emote disponível para sorteio.', 500));
    }
    const wonEmote = allEmotes[Math.floor(Math.random() * allEmotes.length)];
    console.log(`[buyChest] Emote sorteado: ${wonEmote.name}`);

    // 7. Tenta adicionar o emote ao jogador
    let isDuplicate = false;
    console.log(`[buyChest] Adicionando emote ID ${wonEmote.id} ao jogador ID ${userId}`);
    try {
        await userModel.addEmoteToPlayer(userId, wonEmote.id);
    } catch (error) {
        console.warn(`[buyChest] Erro ao adicionar emote: ${error.message}`);
        if (error.code === '23505') { // 'unique_violation' no PostgreSQL
            console.log('[buyChest] Emote é uma duplicata.');
            isDuplicate = true;
        } else {
            console.error('[buyChest] Erro desconhecido ao adicionar emote, repassando...');
            throw error; // Lança outro erro se não for duplicata
        }
    }

    // 8. Calcula o novo total de moedas
    let newCoinTotal = player.cashew_coins - price;
    if (isDuplicate) {
        const refundAmount = Math.floor(price / 4); // Devolve 25%
        newCoinTotal += refundAmount;
        console.log(`[buyChest] Emote duplicado, reembolsando ${refundAmount}. Novo total: ${newCoinTotal}`);
    } else {
        console.log(`[buyChest] Emote novo! Novo total: ${newCoinTotal}`);
    }

    // 9. Atualiza as moedas do jogador no banco
    console.log('[buyChest] Atualizando moedas do jogador no userModel.update...');
    const updatedPlayer = await userModel.update(userId, { cashew_coins: newCoinTotal });

    // 10. Responde para o App com os dados atualizados
    console.log('[buyChest] Sucesso! Respondendo ao cliente.');
    res.status(200).json({
        status: 'success',
        data: {
            player: updatedPlayer,
            emote: wonEmote
        }
    });
});