/**
 * @description Classe de Erro customizada para a API.
 * Estende a classe Error nativa do Node.js para incluir
 * um código de status HTTP e um status 'fail' ou 'error'.
 */
class ApiError extends Error {
    /**
     * @param {string} message - A mensagem de erro.
     * @param {number} statusCode - O código de status HTTP (ex: 404, 400).
     */
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export default ApiError;