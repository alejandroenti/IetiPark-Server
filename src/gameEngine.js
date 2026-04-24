const Player = require("./player");
const PlayerGameState = require("./playerGameState");
const PlayerRegistry = require("./playerRegistry");
const { loadMultiplayerLevel } = require('./multiplayerLevelData.js');

const path = require('path');
const dotenv = require('dotenv');
const Hitbox = require("./hitbox");
const envMode = process.env.NODE_ENV || 'dev';
dotenv.config({ path: path.resolve(process.cwd(), `.env.${envMode}`) });

/**
 *  Objeto encargado de manegar la lógica del juego encargada del movimiento, validar acciones, calcular, etc.
 */
class GameEngine {
    speed = parseFloat(process.env.SPEED);
    acceleration = parseFloat(process.env.GRAVITY_ACCELERATION);
    jumpSpeed = parseFloat(process.env.JUMP_SPEED);

    /**
     * 
     * @param {PlayerRegistry} playerRegistry 
     */
    constructor(playerRegistry) {
        this.playerRegistry = playerRegistry;
        this.LEVEL = loadMultiplayerLevel();
        console.log(`Level data: ${JSON.stringify(this.LEVEL, (key, value) => {
            if (value instanceof Map) return Object.fromEntries(value);
            return value;
        }, 2)}`);
    }

    update() {
        const players = this.playerRegistry.players.values();
        this.#calculateGameStateFor(players);
    }

    #calculateGameStateFor(players) {
        for (const player of players) {
            ////console.log(`[GameEngine.calculateGameStateFor] player BEFORE update --> ${player.toString()}`);
            // Movimiento horizontal
            this.handleHorizontalMovementFor(player);
            // Movimiento vertical
            this.handleVerticalMovementFor(player);
            // Actualizar hitbox a la nueva posición
            player.getGameState().hitbox.updateHitboxPosition(player.getGameState().x, player.getGameState().y);
            ////console.log(`[GameEngine.calculateGameStateFor] player AFTER update --> ${player.toString()}`);
        }
    }

    #handleHorizontalMovementFor(player) {
        const playerGameState = player.getGameState();
        const currentX = playerGameState.x;
        const newX = currentX + (playerGameState.isMovingLeft ? -this.speed : 0) + (playerGameState.isMovingRight ? this.speed : 0);
        // Comprobar colisión de hitbox tras el movimiento horizontal
        if (this.hitboxDoesNotIntersectWithAnyOtherHitbox(player.getId(),
            new Hitbox(
                newX,
                playerGameState.y,
                playerGameState.width,
                playerGameState.height
            ))){
            playerGameState.x = newX;
        }
    }

    handleVerticalMovementFor(player) {
        const playerGameState = player.getGameState();
        const currentY = playerGameState.y;
        // Comprobar qué hacer con 'Y' y verticalSpeed en casos específicos
        if ((playerGameState.y === 0 || playerGameState.canJump) && playerGameState.isJumping) { // Si puede saltar...
            playerGameState.verticalSpeed = this.jumpSpeed;
            playerGameState.canJump = false;
        } else if (playerGameState.y > 0) { // Si está en el aire...
            playerGameState.verticalSpeed -= this.acceleration;
        } else if (playerGameState.y < 0) { // Si atraviesa el suelo...
            playerGameState.y = 0;
            playerGameState.verticalSpeed = 0;
            playerGameState.canJump = true;
        }
        playerGameState.isJumping = false; // El salto se activa solo en el frame que se recibe la orden de salto

        // Calcular qué hacer con el nuevo 'Y' dependiendo de si choca o atraviesa el suelo
        const newY = currentY + playerGameState.verticalSpeed;
        if (this.hitboxDoesNotIntersectWithAnyOtherHitbox(player.getId(), // Si no choca con ninguna hitbox y está por encima del suelo...
            new Hitbox(
                playerGameState.x,
                newY,
                playerGameState.width,
                playerGameState.height
            )) && newY >= 0) {
            playerGameState.y = newY;
        } else if (newY < 0) { // Si atraviesa el suelo...
            playerGameState.y = 0;
            playerGameState.verticalSpeed = 0;
            playerGameState.canJump = true;
        } else { // Si debajo tiene una hitbox...
            // TODO Poner la Y justo sobre la hitbox con la que choca
            playerGameState.verticalSpeed = 0;
            playerGameState.canJump = true;
        }
        
    }

    #hitboxDoesNotIntersectWithAnyOtherHitbox(playerId, hitbox) {
        const players = this.playerRegistry.players.values();
        for (const player of players) {
            if (player.getId() === playerId) continue;
            const playerHitbox = player.getGameState().hitbox;
            if (hitbox.intersects(playerHitbox)) {
                return false;
            }
        }
        // Comprobar colisión con hitboxes de objetos estáticos (suelo, plataformas, etc.)
        if (hitbox.intersects(new Hitbox(704, 0, 96, 300))) { // Puerta
            return false;
        }
        return true;
    }
}

module.exports = GameEngine;