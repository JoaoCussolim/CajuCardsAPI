import * as emoteModel from '../../models/emote_model.js';
import catchAsync from '../../utils/catchAsync.js';
import ApiError from '../../utils/ApiError.js';

/**
 * @description Busca todos os emotes.
 * @route GET /api/emotes
 */
export const getAllEmotes = catchAsync(async (req, res, next) => {
    const emotes = await emoteModel.findAll();
    res.status(200).json({
        status: 'success',
        results: emotes.length,
        data: { emotes },
    });
});

/**
 * @description Busca um emote pelo ID.
 * @route GET /api/emotes/:id
 */
export const getEmoteById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const emote = await emoteModel.findById(id);

    if (!emote) {
        return next(new ApiError('Nenhum emote encontrado com este ID.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { emote },
    });
});

/**
 * @description Cria um novo emote. (Admin)
 * @route POST /api/emotes
 */
export const createEmote = catchAsync(async (req, res, next) => {
    const newEmote = await emoteModel.create(req.body);
    res.status(201).json({
        status: 'success',
        data: { emote: newEmote },
    });
});

/**
 * @description Atualiza um emote. (Admin)
 * @route PATCH /api/emotes/:id
 */
export const updateEmote = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const updatedEmote = await emoteModel.update(id, req.body);

    if (!updatedEmote) {
        return next(new ApiError('Nenhum emote encontrado com este ID para atualizar.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: { emote: updatedEmote },
    });
});

/**
 * @description Deleta um emote. (Admin)
 * @route DELETE /api/emotes/:id
 */
export const deleteEmote = catchAsync(async (req, res, next) => {
        const { id } = req.params;
    const result = await emoteModel.remove(id);

    if (!result) {
        return next(new ApiError('Nenhum emote encontrado com este ID para deletar.', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null,
    });
});