const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const Player = require('./src/player');

const wss = new WebSocketServer({ port: 3000 });
console.log('WebSocket server is running on ws://localhost:3000');
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 8;
const players = [];

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (data) => {
        // Parsear el mensaje recibido como JSON
        let message;
        try {
            message = JSON.parse(data);
        } catch (error) {
            console.error('Error parsing message:', error);
            return;
        }

        // Validar que el mensaje recibido tenga la estructura esperada
        const isValidStructured = validateStructureOf(message);
        if (!isValidStructured) {
            console.error('Received message does not have the expected structure');
            return;
        }
        
        console.log(`Received message: ${message.toString()}`);

        // Actuar dependiendo del tipo de mensaje
        switch (message.type) {
            case "JOIN":
                if (players.length >= MAX_PLAYERS) {
                    sendMessage(ws, "REFUSED", "Número máximo de jugadores alcanzado")
                    ws.close();
                    return;
                }
                const playerId = crypto.randomUUID()
                const playerName = message.payload;
                const newPlayer = new Player(
                    playerId,
                    playerName,
                    ws
                );
                players.push(newPlayer);
                console.log(`Se ha registrado el jugador: ${playerName}`);
                sendMessage(ws, "JOIN_OK", "Has sigo registrado en el server.");
                broadcast("UPDATED PLAYERS", players.length.toString());
                if (players.length >= MIN_PLAYERS) {
                    broadcast("MIN PLAYERS ACHIEVED", "Ya hay jugadores suficientes para comenzar una partida");
                }
                break;
            default:
                console.log(`Tipo de mensaje no esperado: ${message.type}`);
                sendMessage(ws, "ERROR", "Tipo de mensaje no esperado por el server")
                break;
        }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado');
        removePlayer(getPlayerFromSocket(ws));
        broadcast("UPDATED PLAYERS", players.length.toString());
    });
});

/**
 * Valida que el JSON recibido tenga la estructura esperada: un campo "type" y un campo "payload".
 * @param {Object} - El objeto JSON a validar
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
 * @param {WebSocket} ws 
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
 * @param {WebSocket} ws 
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