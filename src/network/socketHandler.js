const geoip = require('geoip-lite');

class SocketHandler {
    /**
     * @param {{
     * wss: import('ws').WebSocketServer,
     * gameService: import('../services/gameService'),
     * logger: import('winston').Logger
     * }} dependencies
     */
    constructor({ wss, gameService, logger }) {
        this.wss = wss;
        this.gameService = gameService;
        this.logger = logger;
    }

    initialize() {
        this.wss.on('connection', (ws, req) => {
            this.logger.debug('[SocketHandler.initialize] Client connected');
            this.gameService.notifyPlayersUpdated();

            // Obtener IP
            const xff = req.headers['x-forwarded-for'];
            const forwarded = Array.isArray(xff) ? xff[0] : xff;
            const rawIp = (forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || null;
            const ip = rawIp ? rawIp.replace(/^::ffff:/, '') : null;

            // Obtener país
            let country = 'Unknown';
            if (ip) {
                const geo = geoip.lookup(ip);
                if (geo) {
                    country = geo.country; // Devuelve código país ('ES', 'US', 'AR', etc.)
                }
            }
            this.logger.info(`New client connected from IP: ${ip}, Country: ${country}`);

            ws.on('message', async (data) => {
                const message = this.parseMessage(data, ws);
                if (!message) {
                    return;
                }

                if (!this.validateStructureOf(message)) {
                    this.logger.info('Received message does not have the expected structure');
                    this.sendMessage(ws, 'INVALID MESSAGE', "Message must have a 'type' field and a 'payload' field");
                    return;
                }

                try {
                    await this.delegateMessage(message, ws);
                } catch (error) {
                    this.logger.error(`Unexpected error while delegating message: ${error.message}`);
                    this.sendMessage(ws, 'INTERNAL ERROR', 'Server could not process your message');
                }
            });

            ws.on('close', () => {
                this.logger.info('Client disconnected');
                this.gameService.handleDisconnect(ws, Array.from(this.wss.clients));
            });

            ws.on('error', () => {
                this.logger.error('Error in connection with a WebSocket');
                this.logger.debug(`Removing player with name=${this.gameService.playerRegistry.getPlayerName(ws)} removed from players due to connection error`);
                this.gameService.handleDisconnect(ws, Array.from(this.wss.clients));
            });
        });
    }

    parseMessage(data, ws) {
        try {
            const message = JSON.parse(data.toString());
            this.logger.debug(`Correctly parsed the following message: ${JSON.stringify(message)}`);
            return message;
        } catch (error) {
            this.logger.error(`Error parsing message: ${error}`);
            this.sendMessage(ws, 'INVALID MESSAGE', 'Message must be a valid JSON string');
            return null;
        }
    }

    validateStructureOf(data) {
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

    async delegateMessage(message, ws) {
        switch (message.type) {
            case 'JOIN':
                await this.gameService.handleJoin(message.payload, ws);
                break;
            case 'MOVE':
                this.gameService.handleMove(message.payload, ws);
                break;
            case 'JUMP':
                this.gameService.handleJump(message.payload, ws);
                break;
            default:
                this.handleUnknownType(message.type, ws);
                break;
        }
    }

    handleUnknownType(messageType, ws) {
        this.logger.info(`Unknown message TYPE recieved (type=${messageType})`);
        this.sendMessage(ws, 'UNKNOWN TYPE', 'Server does not know how to handle this type of message');
        this.logger.debug('Message with unknown type has been sent a response and will be ignored from now on');
    }

    broadcast(type, payload) {
        const message = JSON.stringify({
            type,
            payload
        });
        for (const ws of this.wss.clients) {
            ws.send(message);
        }
    }

    sendMessage(ws, type, payload) {
        const message = JSON.stringify({
            type,
            payload
        });
        ws.send(message);
    }
}

module.exports = SocketHandler;