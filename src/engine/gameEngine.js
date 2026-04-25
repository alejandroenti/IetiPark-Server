const { loadMultiplayerLevel } = require('../multiplayerLevelData.js');

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
     * @param {import('../domain/playerRegistry')} playerRegistry 
     */
    constructor(playerRegistry) {
        this.playerRegistry = playerRegistry;
        this.LEVEL = loadMultiplayerLevel();
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
            player.applyPendingInput();
            this.handleHorizontalMovementFor(player);
            this.handleVerticalMovementFor(player);
            player.getGameState().hitbox.updateHitboxPosition(player.getGameState().x, player.getGameState().y);
            console.log(`[GameEngine.calculateGameStateFor] player AFTER update --> ${player.toString()}`);
        }
    }

    handleHorizontalMovementFor(player) {
        const playerGameState = player.getGameState();
        const currentX = playerGameState.x;
        const newX = currentX + (playerGameState.isMovingLeft ? -this.speed : 0) + (playerGameState.isMovingRight ? this.speed : 0);
        const hitboxWithNewX = new Hitbox(newX, playerGameState.y, playerGameState.width, playerGameState.height, playerGameState.hitbox.anchorX, playerGameState.hitbox.anchorY);
        if (this.hitboxDoesNotIntersectWithAnyOtherHitbox(player.getId(), hitboxWithNewX, true)) {
            playerGameState.x = newX;
        }
    }

    handleVerticalMovementFor(player) {
        const playerGameState = player.getGameState();
        const currentY = playerGameState.y;
        let isPlayerInAir = (currentY + playerGameState.height * playerGameState.hitbox.anchorY) < this.groundHitbox.y;
        if (playerGameState.canJump && playerGameState.isJumping) {
            playerGameState.verticalSpeed = -1 * this.jumpSpeed;
            playerGameState.canJump = false;
        } else if (isPlayerInAir) {
            playerGameState.verticalSpeed += this.acceleration;
        }
        playerGameState.isJumping = false;

        const newY = currentY + playerGameState.verticalSpeed;
        isPlayerInAir = (newY + playerGameState.height * playerGameState.hitbox.anchorY) < this.groundHitbox.y;
        const hitboxWithNewY = new Hitbox(playerGameState.x, newY, playerGameState.width, playerGameState.height, playerGameState.hitbox.anchorX, playerGameState.hitbox.anchorY);
        if (this.hitboxDoesNotIntersectWithAnyOtherHitbox(player.getId(), hitboxWithNewY) && isPlayerInAir) {
            playerGameState.y = newY;
            playerGameState.canJump = false;
        } else if (!isPlayerInAir) {
            playerGameState.y = this.groundHitbox.y - playerGameState.height * playerGameState.hitbox.anchorY;
            playerGameState.verticalSpeed = 0;
            playerGameState.canJump = true;
        } else {
            playerGameState.verticalSpeed = 0;
            playerGameState.canJump = true;
        }
    }

    hitboxDoesNotIntersectWithAnyOtherHitbox(playerId, hitbox, horizontalMovement = false) {
        const players = this.playerRegistry.players.values();
        for (const player of players) {
            if (player.getId() === playerId) continue;
            const playerHitbox = player.getGameState().hitbox;
            if (hitbox.intersectsWith(playerHitbox)) {
                return false;
            }
        }
        if (hitbox.intersectsWith(this.doorHitbox)) {
            console.log(`[GameEngine.hitboxDoesNotIntersectWithAnyOtherHitbox] Player ${playerId} has reached the door!`);
            return false;
        }
        for (const invisibleWallHitbox of this.invisibleWallsHitboxes) {
            if (hitbox.intersectsWith(invisibleWallHitbox)) {
                console.log(`[GameEngine.hitboxDoesNotIntersectWithAnyOtherHitbox] Player ${playerId} has collided with an invisible wall!`);
                return false;
            }
        }
        if (horizontalMovement) return true;
        if (hitbox.intersectsWith(this.groundHitbox)) {
            console.log(`[GameEngine.hitboxDoesNotIntersectWithAnyOtherHitbox] Player ${playerId} has collided with the ground!`);
            return false;
        }
        return true;
    }
}

module.exports = GameEngine;