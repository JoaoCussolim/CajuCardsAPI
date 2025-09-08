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
        super(message); // Chama o construtor da classe Error

        this.statusCode = statusCode;
        // Define o status como 'fail' para erros 4xx (cliente) e 'error' para 5xx (servidor)
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        // Indica que este é um erro operacional, previsível (ex: ID não encontrado)
        this.isOperational = true;

        // Captura o stack trace, excluindo o construtor da chamada
        Error.captureStackTrace(this, this.constructor);
    }
}

export default ApiError;