/**
 *  Objeto encargado de manegar la lógica del juego encargada del movimiento, validar acciones, calcular, etc.
 */
class GameEngine {
    speed = 1;
    acceleration = 1; // Aceleración de gravedad
    jumpSpeed = 5; // Velocidad inicial del salto
    constructor(playerRegistry) {
        this.playerRegistry = playerRegistry;
    }

    update() {
        const players = this.playerRegistry.getPlayersSnapshot();
        const newGameStates = this.calculateGameStateFor(players);
        this.updatePlayerRegistryWith(newGameStates);
    }

    calculateGameStateFor(players) {
        const newGameStates = new Map(); // Map de Player a PlayerGameState
        for (const player of players) {
            let playerGameState = player.getPlayerGameState();
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
            newGameStates.set(player, playerGameState);
        }
        return newGameStates;
    }

    updatePlayerRegistryWith(newGameStates) {
        for (const player of this.playerRegistry.getRealPlayers()) {
            player.setGameState(newGameStates.get(player));
        }
    }
}

module.exports = GameEngine;