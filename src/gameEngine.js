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
        // console.log(`Level data: ${JSON.stringify(this.LEVEL, (key, value) => {
        //     if (value instanceof Map) return Object.fromEntries(value);
        //     return value;
        // }, 2)}`);
        this.ground = this.LEVEL.zones.find(zone => zone.name === 'ground');
        this.groundHitbox = new Hitbox(this.ground.x, this.ground.y, this.ground.width, this.ground.height, 0, 0);
        this.door = this.LEVEL.sprites.find(sprite => sprite.name === 'door');
        this.doorHitbox = new Hitbox(this.door.x, this.door.y, this.door.width, this.door.height, 0.5, 0.5);
        this.invisibleWallsHitboxes = this.LEVEL.zones.filter(zone => zone.name.startsWith('invisible_wall')).map(wall => new Hitbox(wall.x, wall.y, wall.width, wall.height, 0, 0));
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
        const hitboxWithNewX = new Hitbox(newX, playerGameState.y, playerGameState.width, playerGameState.height, playerGameState.hitbox.anchorX, playerGameState.hitbox.anchorY);
        if (this.hitboxDoesNotIntersectWithAnyOtherHitbox(player.getId(), hitboxWithNewX)){
            playerGameState.x = newX;
        }
    }

    handleVerticalMovementFor(player) {
        const playerGameState = player.getGameState();
        const currentY = playerGameState.y;
        let isPlayerInAir = (currentY + playerGameState.height * playerGameState.hitbox.anchorY) < this.groundHitbox.y; // TODO Comprobar colisión con hitboxes de objetos estáticos (suelo, plataformas, etc.) en vez de solo con el suelo
        // Comprobar qué hacer con 'Y' y verticalSpeed en casos específicos
        if (playerGameState.canJump && playerGameState.isJumping) { // Si puede saltar...
            playerGameState.verticalSpeed = -1 * this.jumpSpeed; // -1 porque en el gamestool del albert el eje 'Y' va para abajo (por algún motivo...)
            playerGameState.canJump = false;
        } else if (isPlayerInAir) {
            playerGameState.verticalSpeed += this.acceleration;
        }
        playerGameState.isJumping = false; // El salto se activa solo en el frame que se recibe la orden de salto

        // Calcular qué hacer con el nuevo 'Y' dependiendo de si choca o atraviesa el suelo
        const newY = currentY + playerGameState.verticalSpeed;
        isPlayerInAir = (newY + playerGameState.height * playerGameState.hitbox.anchorY) < this.groundHitbox.y;
        const hitboxWithNewY = new Hitbox(playerGameState.x, newY, playerGameState.width, playerGameState.height, playerGameState.hitbox.anchorX, playerGameState.hitbox.anchorY);
        if (this.hitboxDoesNotIntersectWithAnyOtherHitbox(player.getId(), hitboxWithNewY) && isPlayerInAir) { // Si no choca con nada y está en el aire...
            playerGameState.y = newY;
            playerGameState.canJump = false;
        } else if (!isPlayerInAir) { // Si atraviesa el suelo...
            playerGameState.y = this.groundHitbox.y - playerGameState.height * playerGameState.hitbox.anchorY;
            playerGameState.verticalSpeed = 0;
            playerGameState.canJump = true;
        } else { // Si debajo tiene una hitbox...
            // TODO Poner la Y justo sobre la hitbox con la que choca
            playerGameState.verticalSpeed = 0;
            playerGameState.canJump = true;
        }
        
    }

    hitboxDoesNotIntersectWithAnyOtherHitbox(playerId, hitbox) {
        const players = this.playerRegistry.players.values();
        // Otros jugadores
        for (const player of players) {
            if (player.getId() === playerId) continue;
            const playerHitbox = player.getGameState().hitbox;
            if (hitbox.intersects(playerHitbox)) {
                return false;
            }
        }
        // Puerta
        if (hitbox.intersects(this.doorHitbox)) { // Puerta
            return false;
        }
        // Suelo
        if (hitbox.intersects(this.groundHitbox)) {
            return false;
        }
        // Invisible Walls
        for (const invisibleWallHitbox of this.invisibleWallsHitboxes) {
            if (hitbox.intersects(invisibleWallHitbox)) {
                return false;
            }
        }
        return true;
    }
}

module.exports = GameEngine;