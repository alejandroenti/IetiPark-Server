const PlayerGameState = require("./playerGameState");

/** Objeto que representa a un jugador conectado al servidor.
 * @param {string} id - Identificador único.
 * @param {string} name - Nombre del jugador.
 */
class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.playerGameState = new PlayerGameState(0,0);
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
        if (direction === 'LEFT') {
            this.playerGameState.isMovingLeft = true;
            this.playerGameState.isMovingRight = false;
        } else if (direction === 'RIGHT') {
            this.playerGameState.isMovingLeft = false;
            this.playerGameState.isMovingRight = true;
        } else if (direction === 'NONE') {
            this.playerGameState.isMovingLeft = false;
            this.playerGameState.isMovingRight = false;
        }
    }

    toString() {
        return `Player ${this.name} (id=${this.id}): ${this.playerGameState.toString()}`;
    }
}

module.exports = Player;