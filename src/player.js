const PlayerGameState = require("./playerGameState");

/** Objeto que representa a un jugador conectado al servidor.
 * @param {string} id - Identificador único.
 * @param {string} name - Nombre del jugador.
 */
class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.playerGameState = new PlayerGameState(20,0); // Que empiece en el cielo, del nivel del Games_Tool
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name
        };
    }

    getGameState() {
        return this.playerGameState;
    }

    setGameState(gameState) {
        this.playerGameState = gameState;
    }

    isMovingInThis(direction) {
        if (this.playerGameState.isMovingLeft && direction === 'LEFT') {
            return true;
        }
        if (this.playerGameState.isMovingRight && direction === 'RIGHT') {
            return true;
        }
        if (!this.playerGameState.isMovingLeft && !this.playerGameState.isMovingRight && direction === 'NONE') {
            return true;
        }
        return false;
    }

    setThisMovement(direction) {
        //console.log(`[Player.setThisMovement] Setting movement for player ${this.name} in direction ${direction}`);
        if (direction === 'LEFT') {
            this.playerGameState.isMovingLeft = true;
            this.playerGameState.isMovingRight = false;
            //console.log(`[Player.setThisMovement] Player ${this.name} is now moving left`);
        } else if (direction === 'RIGHT') {
            this.playerGameState.isMovingLeft = false;
            this.playerGameState.isMovingRight = true;
            //console.log(`[Player.setThisMovement] Player ${this.name} is now moving right`);
        } else if (direction === 'NONE') {
            this.playerGameState.isMovingLeft = false;
            this.playerGameState.isMovingRight = false;
            //console.log(`[Player.setThisMovement] Player ${this.name} is now not moving horizontally`);
        }
    }

    toString() {
        return `Player ${this.name} (id=${this.id}): ${this.playerGameState.toString()}`;
    }

    equals(otherPlayer) {
        return this.id === otherPlayer.id;
    }

    getId() {
        return this.id;
    }
}

module.exports = Player;