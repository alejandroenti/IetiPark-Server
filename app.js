// Modulos
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const winston = require('winston');
const path = require('path');
const dotenv = require('dotenv');
// Clases
const Player = require('./src/player');
const PlayerRegistry = require('./src/playerRegistry');
const Game = require('./src/game');

// .env correspondiente
const envMode = process.env.NODE_ENV || 'dev';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${envMode}`) });

// Logger
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

// Server
const playerRegistry = new PlayerRegistry();
const game = new Game();

const wss = new WebSocketServer({ port: Number(process.env.SERVER_PORT) });
logger.info(`WebSocket server is running on ws://localhost:${process.env.SERVER_PORT}`);
wss.on('connection', (ws) => {
    logger.debug('Client connected');

    ws.on('message', (data) => {
        // Parsear el mensaje recibido a JSON
        let message;
        logger.debug(`Received message: ${data.toString()}`);
        try {
            message = JSON.parse(data.toString());
            logger.debug(`Correctly parsed the following message: ${message.toString()}`);
        } catch (error) {
            logger.error(`Error parsing message: ${error}`);
            sendMessage(ws, "INVALID MESSAGE", "Message must be a valid JSON string");
            return;
        }

        // Validar que el mensaje recibido tenga la estructura esperada
        const isValidStructured = validateStructureOf(message);
        if (!isValidStructured) {
            logger.info('Received message does not have the expected structure');
            sendMessage(ws, "INVALID MESSAGE", "Message must have a 'type' field and a 'payload' field");
            return;
        }

        // Actuar dependiendo del tipo de mensaje
        switch (message.type) {
            case "JOIN":
                handleJoin(message.payload, ws);
                break;
            default:
                handleUnknownType(message.type, ws);
                break;
        }
    });

    ws.on('close', () => {
        logger.info('Client disconnected');
        playerRegistry.removePlayer(ws);
        playerRegistry.removeGhostPlayers(Array.from(wss.clients));
        notifyPlayersUpdated();
        handleGameState();
    });

    ws.on('error', () => {
        logger.error('Error in connection with a WebSocket');
        logger.debug(`Removing player with name=${playerRegistry.getPlayerName(ws)} removed from players due to connection error`);
        playerRegistry.removePlayer(ws);
        playerRegistry.removeGhostPlayers(Array.from(wss.clients));
        notifyPlayersUpdated();
        handleGameState();
    });
});

/**
 * Valida que el JSON recibido tenga la estructura esperada: un campo "type" y un campo "payload".
 * @param {Object} data - El objeto JSON a validar
 * @returns {boolean} true si la estructura es válida, false de lo contrario
 */
function validateStructureOf(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    const keys = Object.keys(data);
    if (keys.length !== 2) {
        return false;
    }
    if (!keys.includes('type') || !keys.includes('payload')) {
        return false;
    }
    return true;
}

/**
 * Envía un mensaje a todos los jugadores registrados
 * @param {string} type 
 * @param {unknown} payload 
 */
function broadcast(type, payload) {
    for (const ws of playerRegistry.getWsSnapshot()) {
        sendMessage(ws, type, payload)
    }
}

/**
 * Envía un mensaje a un socket con una estructura Type, Payload
 * @param {import('ws').WebSocket} ws 
 * @param {string} type 
 * @param {unknown} payload 
 */
function sendMessage(ws, type, payload) {
    const message = JSON.stringify({
        type: type,
        payload: payload
    });
    ws.send(message);
}

/**
 * Lógica para controlar los mensajes JOIN
 * @param {string} payload
 * @param {import('ws').WebSocket} ws
 */
function handleJoin(payload, ws) {
    // Comprobar que el player no está ya registrado
    if (playerRegistry.wsIsRegistered(ws)) {
        sendMessage(ws, "REFUSED JOIN", "You are already registered");
        logger.info('A player tried to join but was already registered');
        return;
    }

    // Comprobar que caben nuevos jugadores
    if (playerRegistry.isFull()) {
        sendMessage(ws, "REFUSED JOIN", "Maximum number of players reached");
        ws.close();
        logger.info('A player tried to join but the room was full');
        return;
    }
    // Comprobar que el nombre del jugador no está repetido
    const playerName = payload;
    if (playerRegistry.nameIsAlreadyTaken(playerName)) {
        sendMessage(ws, "REFUSED JOIN", "Player name already taken");
        ws.close();
        logger.info(`A player tried to join with a taken name: ${playerName}`);
        return;
    }

    // Crear nuevo jugador
    const playerId = crypto.randomUUID()
    const newPlayer = new Player(
        playerId,
        playerName
    );
    logger.debug(`New Player object generated (playerId=${playerId}, playerName=${playerName})`);

    // Añadir a la lista de jugadores
    playerRegistry.addPlayer(ws, newPlayer);
    logger.info(`New registered player: ${playerName}`);

    // Notificar a jugadores estado actual de la sala
    sendMessage(ws, "ACCEPTED JOIN", null);
    notifyPlayersUpdated();

    // Si se ha alcanzado el número mínimo de jugadores para iniciar la partida, iniciar la partida
    handleGameState();
}

/**
 * Notifica a todos los jugadores registrados sobre el estado actualizado de la sala
 */
function notifyPlayersUpdated() {
    const playersSnapshot = playerRegistry.getPlayersSnapshot();
    const playersJson = playersSnapshot.map(player => player.toJSON());
    broadcast("PLAYERS", playersJson);
    logger.debug(`All players have been notified with current room. Current Nº of Players: ${playerRegistry.getSize()}`);
}

/**
 * Lógica para controlar los mensajes de tipo desconocido
 * @param {string} messageType 
 * @param {import('ws').WebSocket} ws 
 */
function handleUnknownType(messageType, ws) {
    logger.info(`Unknown message TYPE recieved (type=${messageType})`);
    sendMessage(ws, "UNKNOWN TYPE", "Server does not know how to handle this type of message");
    logger.debug(`Message with unknown type has been sent a response and will be ignored from now on`);
}

function handleGameState() {
    if (game.isWaiting()) {
        if (playerRegistry.isEnoughPlayersToPlay()) {
            game.start();
            broadcast("START GAME", null);
            logger.info('Game has been started');
        }
    } else if (game.isPlaying()) {
        if (!playerRegistry.isEnoughPlayersToPlay()) {
            game.finish();
            broadcast("WAIT GAME", "Not enough players to continue the game");
            logger.info('Game has been paused due to lack of players');
        }
    }
}