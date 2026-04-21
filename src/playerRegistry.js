/**
 * PlayerRegistry maneja los jugadores registrados en el servidor, permitiendo agregar, obtener y eliminar jugadores de la lista de jugadores registrados.
 */
class PlayerRegistry {
    static MIN_PLAYERS = 2;
    static MAX_PLAYERS = 8;

    constructor() {
        this.players = new Map(); // Map de WebSocket a Player
    }

    addPlayer(ws, player) {
        if (!this.wsIsRegistered(ws)) {
            this.players.set(ws, player);
        }
    }

    getPlayer(ws) {
        return this.players.get(ws);
    }

    removePlayer(ws) {
        if (this.wsIsRegistered(ws)) {
            this.players.delete(ws);
        }
    }

    wsIsRegistered(ws) {
        return this.players.has(ws);
    }

    nameIsAlreadyTaken(name) {
        for (const player of this.players.values()) {
            if (player.name === name) {
                return true;
            }
        }
        return false;
    }

    isEnoughPlayersToPlay() {
        return this.players.size >= PlayerRegistry.MIN_PLAYERS;
    }

    isFull() {
        return this.players.size >= PlayerRegistry.MAX_PLAYERS;
    }

    getAllSockets() {
        return Array.from(this.players.keys());
    }

    removeGhostPlayers(activeSockets) {
        for (const ws of this.players.keys()) {
            if (!activeSockets.includes(ws)) {
                this.removePlayer(ws);
            }
        }
    }

    getWsSnapshot() {
        return Array.from(this.players.keys());
    }

    getPlayersSnapshot() {
        return Array.from(this.players.values());
    }

    /**
     * Utilizar con cuidado, no es una copia
     */
    getRealPlayers() {
        return this.players.values();
    }

    getSize() {
        return this.players.size;
    }

    getPlayerName(ws) {
        const player = this.getPlayer(ws);
        return player ? player.name : null;
    }

    setMovement(ws, direction) {
        if (!this.wsIsRegistered(ws)) {
            //console.log(`[PlayerRegistry.setMovement] WebSocket ${ws} is not registered in PlayerRegistry`);
            return;
        }
        const player = this.getPlayer(ws);
        // Si el jugador ya se está moviendo en esa dirección, no hago nada
        if (player.isMovingInThis(direction)) {
            //console.log(`[PlayerRegistry.setMovement] Player ${player.name} is already moving in direction ${direction}`);
            return;
        }
        //console.log(`[PlayerRegistry.setMovement] Setting movement for player ${player.name} in direction ${direction}`);
        player.setThisMovement(direction);
    }

    setJump(ws) {
        const player = this.getPlayer(ws);
        if (player) {
            player.getGameState().isJumping = true;
        }
    }

}

module.exports = PlayerRegistry;