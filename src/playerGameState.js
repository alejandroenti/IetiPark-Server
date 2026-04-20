/**
 * Objeto que representa el estado de un jugador en el juego, como posición, estado de salto, si tiene llave, hitbox, etc.
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
        this.hitbox = null; // TODO Definir hitbox a partir de assets
    }

    toString() {
        return `x=${this.x}, y=${this.y}, verticalSpeed=${this.verticalSpeed}`;
    }
}

module.exports = PlayerGameState;