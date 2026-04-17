const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const Player = require('./src/player');
const winston = require('winston');
const path = require('path');
const dotenv = require('dotenv');

// .env correspondiente
const envMode = process.env.NODE_ENV || 'dev';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${envMode}`) });

// Logger
const logger = winston.createLogger({
    level: 'info',
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
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const players = [];

const wss = new WebSocketServer({ port: Number(process.env.SERVER_PORT) });
logger.info(`WebSocket server is running on ws://localhost:${process.env.SERVER_PORT}`);
wss.on('connection', (ws) => {
    logger.debug('Client connected');

    ws.on('message', (data) => {
        // Parsear el mensaje recibido a JSON
        let message;
        try {
            message = JSON.parse(data.toString());
            logger.debug(`Correctly parsed the following message: ${message.toString()}`);
        } catch (error) {
            logger.error(`Error parsing message: ${error}`);
            return;
        }

        // Validar que el mensaje recibido tenga la estructura esperada
        const isValidStructured = validateStructureOf(message);
        if (!isValidStructured) {
            logger.info('Received message does not have the expected structure');
            return;
        }

        // Actuar dependiendo del tipo de mensaje
        switch (message.type) {
            case "JOIN":
                handleJoin(message, ws);
                break;
            default:
                logger.info(`Unknown message TYPE recieved (type=${message.type})`);
                sendMessage(ws, "UNKNOWN TYPE", "Server does not know how to handle this type of message");
                break;
        }
    });

    ws.on('close', () => {
        logger.info('Client disconnected');
        removePlayer(getPlayerFromSocket(ws));
        removeGhostPlayers();
        broadcast("UPDATED PLAYERS", players.length.toString());
    });

    ws.on('error', () => {
        logger.error('Error in connection with a WebSocket');
        const player = getPlayerFromSocket(ws);
        if (player !== null) {
            removePlayer(player);
            logger.debug(`Player with gameId=${player.gameId} & name=${player.name} removed from players due to connection error`);
        }
        removeGhostPlayers();
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
 * @param {string} payload 
 */
function broadcast(type, payload) {
    for (const player of players) {
        sendMessage(player.ws, type, payload)
    }
}

/**
 * Elimina a un jugador de la lista de jugadores registrados
 * @param {Player} playerToRemove 
 * @returns 
 */
function removePlayer(playerToRemove) {
    for (let i=0; i<players.length; i++) {
        if (players[i].id === playerToRemove.id) {
            players.splice(i, 1);
            return;
        }
    }
};

/**
 * Obtiene un objeto Player de la lista de jugadores registrados a partir de su WebSocket
 * @param {import('ws').WebSocket} ws 
 * @returns 
 */
function getPlayerFromSocket(ws) {
    for (const player of players) {
        if (ws === player.ws) {
            return player;
        }
    }
}

/**
 * Envía un mensaje a un socket con una estructura Type, Payload
 * @param {import('ws').WebSocket} ws 
 * @param {string} type 
 * @param {string} payload 
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
 * @returns 
 */
function handleJoin(message, ws) {
    // Comprobar que caben nuevos jugadores
    if (players.length >= MAX_PLAYERS) {
        sendMessage(ws, "REFUSED", "Maximum number of players reached, you will not be added to game");
        ws.close();
        return;
    }
    // Crear nuevo jugador
    const playerId = crypto.randomUUID()
    const playerName = message.payload;
    const newPlayer = new Player(
        playerId,
        playerName,
        ws
    );
    logger.debug(`New Player object generated (playerId=${playerId}, playerName=${playerName})`);

    // Añadir a la lista de jugadores
    players.push(newPlayer);
    logger.info(`New registered player: ${playerName}`);

    // Notificar a jugadores estado actual de la sala
    sendMessage(ws, "JOIN_OK", "You have been succesfully registered");
    broadcast("UPDATED PLAYERS", players.length.toString());
    logger.debug(`All players have been notified with current room. Current Nº of Players: ${players.length}`);
    if (players.length >= MIN_PLAYERS) {
        broadcast("MIN PLAYERS ACHIEVED", "There are enough players to start the game");
    }
}

/**
 * Elimina de 'players' a todos los players cuyo Socket no está registrado por el server ("juegadores fantasma")
 */
function removeGhostPlayers() {
    const playersSnapshot = getPlayersSnapshot();
    const activeSockets = wss.clients;
    for (const player of playersSnapshot) {
        if (!activeSockets.has(player.ws)) {
            logger.info(`Cleaning up ghost player: ${player.name}`);
            removePlayer(player);
        }
    }
}

/**
 * Devuelve una snapshot del estado actual de players
 * @returns {Player[]} Array con una copia del contenido de 'players'
 */
function getPlayersSnapshot() {
    return [...players];
}