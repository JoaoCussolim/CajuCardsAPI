import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';

import apiRoutes from './src/api/index.js';
import socketHandler from './src/socket/index.js';
import MatchManager from './src/game/MatchManager.js';

import * as cardModel from './src/models/card_model.js';

const startServer = async () => {
    console.log('Carregando dados das cartas do banco de dados...');
    const allCards = await cardModel.findAll();

    const app = express();
    const httpServer = createServer(app);
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    app.use(express.json());

    app.use('/api', apiRoutes);

    const matchManager = new MatchManager(io, allCards);
    socketHandler(io, matchManager);

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
        console.log(`Servidor (API e Socket.IO) rodando na porta ${PORT}`);
    });
};

startServer();