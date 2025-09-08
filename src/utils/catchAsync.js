/**
 * @description Função que "embrulha" (wraps) uma função de controller assíncrona
 * para capturar quaisquer erros e passá-los para o middleware de erro do Express.
 * @param {function} fn - A função de controller assíncrona (ex: createCard, getAllUsers).
 * @returns {function} Uma nova função que executa a original e captura erros.
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(err => next(err));
    };
};

export default catchAsync;