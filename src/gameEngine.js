const Player = require("./player");
const PlayerGameState = require("./playerGameState");
const PlayerRegistry = require("./playerRegistry");

/**
 *  Objeto encargado de manegar la lógica del juego encargada del movimiento, validar acciones, calcular, etc.
 * 
 */
class GameEngine {
    speed = 1;
    acceleration = 1; // Aceleración de gravedad
    jumpSpeed = 5; // Velocidad inicial del salto
    /**
     * 
     * @param {PlayerRegistry} playerRegistry 
     */
    constructor(playerRegistry) {
        this.playerRegistry = playerRegistry;
    }

    update() {
        const players = this.playerRegistry.players.values();
        this.calculateGameStateFor(players);
    }

    /**
     * 
     * @param {Player[]} players 
     */
    calculateGameStateFor(players) {
        for (const player of players) {
            console.log(`[GameEngine.calculateGameStateFor] player BEFORE update --> ${player.toString()}`);
            const playerGameState = player.getGameState();
            // Movimiento horizontal
            playerGameState.x += (playerGameState.isMovingLeft ? -this.speed : 0) + (playerGameState.isMovingRight ? this.speed : 0);
            // Movimiento vertical
            if (playerGameState.y === 0 && playerGameState.isJumping) {
                playerGameState.verticalSpeed = this.jumpSpeed;
            } else if (playerGameState.y > 0) {
                playerGameState.verticalSpeed -= this.acceleration;
            } else if (playerGameState.y < 0) {
                playerGameState.y = 0;
                playerGameState.verticalSpeed = 0;
            }
            playerGameState.y += playerGameState.verticalSpeed;
            playerGameState.isJumping = false; // El salto se activa solo en el frame que se recibe la orden de salto
            // Añadir PlayerGameState actualizado a la lista de nuevos estados de juego
            player.setGameState(playerGameState);
            console.log(`[GameEngine.calculateGameStateFor] player AFTER update --> ${player.toString()}`);
        }
    }
}

module.exports = GameEngine;