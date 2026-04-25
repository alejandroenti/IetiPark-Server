const crypto = require('crypto');
const Player = require('../domain/player');

class GameService {
    /**
     * @param {{
     * game: import('../game'),
     * logger: import('winston').Logger,
     * sendMessage: (ws: import('ws').WebSocket, type: string, payload: unknown) => void,
     * broadcast: (type: string, payload: unknown) => void
     * }} dependencies
     */
    constructor({ game, logger, sendMessage, broadcast }) {
        this.game = game;
        this.logger = logger;
        this.sendMessage = sendMessage;
        this.broadcast = broadcast;
    }

    get playerRegistry() {
        return this.game.getPlayerRegistry();
    }

    handleJoin(payload, ws) {
        if (this.playerRegistry.wsIsRegistered(ws)) {
            this.sendMessage(ws, 'REFUSED JOIN', 'You are already registered');
            this.logger.info('A player tried to join but was already registered');
            return;
        }

        if (this.playerRegistry.isFull()) {
            this.sendMessage(ws, 'REFUSED JOIN', 'Maximum number of players reached');
            ws.close();
            this.logger.info('A player tried to join but the room was full');
            return;
        }

        const playerName = payload;
        if (this.playerRegistry.nameIsAlreadyTaken(playerName)) {
            this.sendMessage(ws, 'REFUSED JOIN', 'Player name already taken');
            ws.close();
            this.logger.info(`A player tried to join with a taken name: ${playerName}`);
            return;
        }

        const playerId = crypto.randomUUID();
        const newPlayer = new Player(playerId, playerName);
        this.logger.debug(`New Player object generated (playerId=${playerId}, playerName=${playerName})`);

        this.playerRegistry.addPlayer(ws, newPlayer);
        this.logger.info(`New registered player: ${playerName}`);

        this.sendMessage(ws, 'ACCEPTED JOIN', null);
        this.notifyPlayersUpdated();
        this.handleGameState();
    }

    handleMove(payload, ws) {
        this.logger.debug(`Received a MOVE message with payload: ${JSON.stringify(payload)}`);
        if (!this.playerRegistry.wsIsRegistered(ws)) {
            this.sendMessage(ws, 'REFUSED MOVE', 'You must join the game before sending moves');
            this.logger.debug('A client tried to send a move but was not registered as player');
            return;
        }

        ws.send('MOVE RECEIVED');
        const isValidMove = ['LEFT', 'RIGHT', 'NONE'].includes(payload);
        if (isValidMove) {
            this.logger.debug('Received a valid move: ' + payload);
            this.sendMessage(ws, 'VALID MOVE', null);
            this.playerRegistry.setMovement(ws, payload);
        } else {
            this.logger.debug(`Received an invalid move: ${payload}`);
            this.sendMessage(ws, 'INVALID MOVE', "Move must be 'LEFT', 'RIGHT' or 'NONE'");
        }
    }

    handleJump(payload, ws) {
        this.logger.debug(`Received a JUMP message with payload: ${JSON.stringify(payload)}`);
        if (!this.playerRegistry.wsIsRegistered(ws)) {
            this.sendMessage(ws, 'REFUSED JUMP', 'You must join the game before sending jumps');
            this.logger.debug('A client tried to send a jump but was not registered as player');
            return;
        }

        ws.send('JUMP RECEIVED');
        this.logger.debug('Received a valid jump');
        this.playerRegistry.setJump(ws);
    }

    handleDisconnect(ws, activeSockets) {
        this.playerRegistry.removePlayer(ws);
        this.playerRegistry.removeGhostPlayers(activeSockets);
        this.notifyPlayersUpdated();
        this.handleGameState();
    }

    notifyPlayersUpdated() {
        const playersSnapshot = this.playerRegistry.getPlayersSnapshot();
        const playersJson = playersSnapshot.map(player => player.toJSON());
        this.broadcast('PLAYERS', playersJson);
        this.logger.debug(`All players have been notified with current room. Current Nº of Players: ${this.playerRegistry.getSize()}`);
    }

    handleGameState() {
        return; // Por ahora el juego no se pausa ni se reanuda, siempre está en modo "play"
    }
}

module.exports = GameService;