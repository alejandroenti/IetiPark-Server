/**
 * Objeto que representa el estado de un jugador en el juego, como posición, estado de salto, si tiene llave, hitbox, etc.
 */
class PlayerGameState {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.isMovingLeft = false;
        this.isMovingRight = false;
        this.isJumping = false;
        this.hasKey = false;
        this.hitbox = null; // TODO Definir hitbox a partir de assets
    }
}

module.exports = PlayerGameState;