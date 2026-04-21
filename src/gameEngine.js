const Player = require("./player");
const PlayerGameState = require("./playerGameState");
const PlayerRegistry = require("./playerRegistry");

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
    }

    update() {
        const players = this.playerRegistry.players.values();
        this.calculateGameStateFor(players);
    }

    calculateGameStateFor(players) {
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

    handleHorizontalMovementFor(player) {
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
    }

    hitboxDoesNotIntersectWithAnyOtherHitbox(playerId, hitbox) {
        const players = this.playerRegistry.players.values();
        for (const player of players) {
            if (player.getId() === playerId) continue;
            const playerHitbox = player.getGameState().hitbox;
            if (hitbox.intersects(playerHitbox)) {
                return false;
            }
        }
        return true;
    }
}

module.exports = GameEngine;