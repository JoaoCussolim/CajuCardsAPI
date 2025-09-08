import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Importa as rotas da API e o novo handler do socket
import apiRoutes from './src/api/index.js';
//import socketHandler from './src/socket/index.js';

// --- Configuração Inicial ---
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- Middlewares do Express ---
app.use(express.json());

// --- Rotas da API REST ---
app.use('/api', apiRoutes);

// --- Lógica do Socket.IO ---
// Delega toda a lógica de conexão e eventos para o handler especializado
//socketHandler(io);

// --- Inicialização do Servidor ---
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Servidor (API e Socket.IO) rodando na porta ${PORT}`);
});

// estrutura do .env
//SUPABASE_URL=
//SUPABASE_ANON_KEY=
//SUPABASE_SERVICE_ROLE_KEY=