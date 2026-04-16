const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 3000 });
console.log('WebSocket server is running on ws://localhost:3000');

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
    });

    ws.on('close', () => {
        console.log('Client disconnected');
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