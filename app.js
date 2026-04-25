const { WebSocketServer } = require('ws');
const winston = require('winston');
const path = require('path');
const dotenv = require('dotenv');

const Game = require('./src/game');
const GameService = require('./src/services/gameService');
const SocketHandler = require('./src/network/socketHandler');

const envMode = process.env.NODE_ENV || 'dev';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${envMode}`) });

const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: './logs/server.log' })
    ],
});

const game = new Game();
const wss = new WebSocketServer({ port: Number(process.env.SERVER_PORT) });

const socketHandler = new SocketHandler({ wss, logger, gameService: null });
const gameService = new GameService({
    game,
    logger,
    sendMessage: socketHandler.sendMessage.bind(socketHandler),
    broadcast: socketHandler.broadcast.bind(socketHandler)
});
socketHandler.gameService = gameService;
socketHandler.initialize();

logger.info(`WebSocket server is running on ws://localhost:${process.env.SERVER_PORT}`);

setInterval(() => {
    game.update();
    socketHandler.broadcast('GAME STATE', getGameState());
}, 1000 / 30);

function getGameState() {
    const payload = {
        players: game.getPlayersGameStates(),
        currentLevel: game.currentLevel.getCurrentLevelState()
    };
    return payload;
}