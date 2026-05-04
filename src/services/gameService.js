const Player = require('../domain/player');
const crypto = require('crypto');

class GameService {
    /**
     * @param {{
     * game: import('../game'),
     * logger: import('winston').Logger,
     * mongoService: import('./mongoService'),
     * sendMessage: (ws: import('ws').WebSocket, type: string, payload: unknown) => void,
     * broadcast: (type: string, payload: unknown) => void
     * }} dependencies
     */
    constructor({ game, logger, mongoService, sendMessage, broadcast }) {
        this.game = game;
        this.logger = logger;
        this.mongoService = mongoService;
        this.sendMessage = sendMessage;
        this.broadcast = broadcast;
        this.currentGameStartDate = null;
    }

    get playerRegistry() {
        return this.game.getPlayerRegistry();
    }

    async handleJoin(payload, ws) {
        const playersBeforeJoin = this.playerRegistry.getSize();

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
        if (typeof playerName !== 'string' || !playerName.trim()) {
            this.sendMessage(ws, 'REFUSED JOIN', 'Player name must be a non-empty string');
            ws.close();
            this.logger.info('A player tried to join with an invalid name');
            return;
        }

        if (this.playerRegistry.nameIsAlreadyTaken(playerName)) {
            this.sendMessage(ws, 'REFUSED JOIN', 'Player name already taken');
            ws.close();
            this.logger.info(`A player tried to join with a taken name: ${playerName}`);
            return;
        }

        let playerDbRecord;
        try {
            // Si existe `nom`, reutiliza `id`; si no existe, crea un registro nuevo.
            playerDbRecord = await this.mongoService.findOrCreatePlayerByNom(playerName);
        } catch (error) {
            this.logger.error(`Error creating/finding player in MongoDB: ${error.message}`);
            this.sendMessage(ws, 'REFUSED JOIN', 'Internal error while creating player');
            ws.close();
            return;
        }

        const playerId = playerDbRecord.id;
        const newPlayer = new Player(playerId, playerDbRecord.nom);
        this.logger.debug(`Player object generated from MongoDB (playerId=${playerId}, playerName=${playerDbRecord.nom}, created=${playerDbRecord.created})`);

        this.playerRegistry.addPlayer(ws, newPlayer);
        this.logger.info(`New registered player: ${playerDbRecord.nom}`);

        if (playersBeforeJoin === 0) {
            this.startGameIfNeeded();
        }

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

    async handleDisconnect(ws, activeSockets) {
        this.handleKeyUnassignmentForDisconnectedPlayer(ws);
        this.playerRegistry.removePlayer(ws);
        this.playerRegistry.removeGhostPlayers(activeSockets);

        if (this.playerRegistry.getSize() === 0) {
            await this.finishCurrentGameIfNeeded();
        }

        this.notifyPlayersUpdated();
        this.handleGameState();
    }

    startGameIfNeeded() {
        if (this.currentGameStartDate) {
            return;
        }

        this.currentGameStartDate = new Date();
        this.logger.info(`A new game has started at ${this.currentGameStartDate.toISOString()}`);
    }

    async finishCurrentGameIfNeeded() {
        if (!this.currentGameStartDate) {
            return;
        }

        const startDate = this.currentGameStartDate;
        const endDate = new Date();

        try {
            const games = await this.mongoService.getCollection('games');
            await games.insertOne({
                _id: crypto.randomUUID(),
                hora_de_comencament_de_la_partida: startDate,
                hora_de_finalitzacio_de_la_partida: endDate
            });

            this.logger.info(`Game saved in MongoDB (start=${startDate.toISOString()}, end=${endDate.toISOString()})`);
            this.currentGameStartDate = null;
        } catch (error) {
            this.logger.error(`Error saving game in MongoDB: ${error.message}`);
        }
    }

    async handleSecondLevelCompletionIfNeeded() {
        if (!this.game.consumeSecondLevelCompletionEvent()) {
            return;
        }

        await this.finishCurrentGameIfNeeded();
    }

    /**
     * Si el jugador desconectado tenía la llave, se la quitamos para que otro jugador pueda tomarla.
     * Si la puerta no está abierta, ponemos la llave disponible.
     * @param {WebSocket} ws 
     * @returns 
     */
    handleKeyUnassignmentForDisconnectedPlayer(ws) {
        const player = this.playerRegistry.getPlayer(ws);
        if (!player) return;
        if (player.getGameState().hasKey) {
            player.removeKey();
            this.logger.info(`Player ${player.name} disconnected and dropped the key`);
            if (this.game.currentLevel.isKeyTaken() && !this.game.currentLevel.isDoorOpen()) {
                this.game.currentLevel.makeKeyAvailable();
            }
        }
    }

    notifyPlayersUpdated() {
        const playersSnapshot = this.playerRegistry.getPlayersSnapshot();
        const payload = new Map();
        const playersJson = playersSnapshot.map(player => player.toJSON());
        
        this.broadcast('PLAYERS', playersJson);
        this.logger.debug(`All players have been notified with current room. Current Nº of Players: ${this.playerRegistry.getSize()}`);
    }

    handleGameState() {
        return; // Por ahora el juego no se pausa ni se reanuda, siempre está en modo "play"
    }
}

module.exports = GameService;