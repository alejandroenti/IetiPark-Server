const Hitbox = require("./hitbox");

/**
 * Objeto que representa el estado de un jugador en el juego, como posición, estado de salto, si tiene llave, hitbox, etc.
 * 
 */
class PlayerGameState {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.verticalSpeed = 0;
        this.isMovingLeft = false;
        this.isMovingRight = false;
        this.isJumping = false;
        this.hasKey = false;
        this.width = 32; // TODO Coger hitbox de assets
        this.height = 32; // TODO Coger hitbox de mapa
        this.hitbox = new Hitbox(this.x, this.y, this.width, this.height);
    }

    toString() {
        return `x=${this.x}, y=${this.y}, verticalSpeed=${this.verticalSpeed}, isMovingLeft=${this.isMovingLeft}, isMovingRight=${this.isMovingRight}, isJumping=${this.isJumping}, hasKey=${this.hasKey}`;
    }
}

module.exports = PlayerGameState;