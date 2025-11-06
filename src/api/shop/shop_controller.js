import * as userModel from '../../models/user_model.js';
import * as emoteModel from '../../models/emote_model.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

const CHEST_PRICES = {
    'bau_mercurio': 200,
    'bau_plutonio': 300,
    'bau_uranio': 400
};

/**
 * @description Compra um baú, debita moedas e sorteia um emote.
 * @route POST /api/shop/buy-chest
 */
export const buyChest = catchAsync(async (req, res, next) => {
    // 1. Pega o ID do usuário (do middleware 'protect') e o nome do baú
    const { chest_name } = req.body;
    const userId = req.user.id;

    // 2. Verifica se é um baú válido e pega o preço
    const price = CHEST_PRICES[chest_name];
    if (!price) {
        return next(new ApiError('Tipo de baú inválido.', 400));
    }

    // 3. Busca o jogador e verifica se ele tem moedas
    const player = await userModel.findById(userId);
    if (player.cashew_coins < price) {
        // 402 = Payment Required (Pagamento Necessário)
        return next(new ApiError('Moedas insuficientes.', 402));
    }

    // 4. Sorteia um emote
    const allEmotes = await emoteModel.findAll();
    if (!allEmotes || allEmotes.length === 0) {
        return next(new ApiError('Nenhum emote disponível para sorteio.', 500));
    }
    const wonEmote = allEmotes[Math.floor(Math.random() * allEmotes.length)];

    // 5. Tenta adicionar o emote ao jogador
    let isDuplicate = false;
    try {
        await userModel.addEmoteToPlayer(userId, wonEmote.id);
    } catch (error) {
        // Código '23505' é 'unique_violation' no PostgreSQL (emote duplicado)
        if (error.code === '23505') {
            isDuplicate = true;
        } else {
            throw error; // Lança outro erro se não for duplicata
        }
    }

    // 6. Calcula o novo total de moedas
    let newCoinTotal = player.cashew_coins - price;
    
    // Opcional: Dar uma "recompensa" por emotes duplicados
    if (isDuplicate) {
        const refundAmount = Math.floor(price / 4); // Ex: Devolve 25% do valor
        newCoinTotal += refundAmount;
    }

    // 7. Atualiza as moedas do jogador no banco
    const updatedPlayer = await userModel.update(userId, { cashew_coins: newCoinTotal });

    // 8. Responde para o App com os dados atualizados
    res.status(200).json({
        status: 'success',
        data: {
            player: updatedPlayer, // O novo estado do jogador (com menos moedas)
            emote: wonEmote        // O emote que ele ganhou
        }
    });
});