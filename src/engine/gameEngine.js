
const path = require('path');
const dotenv = require('dotenv');
const Hitbox = require("./hitbox");
const envMode = process.env.NODE_ENV || 'dev';
const logger = require('../logger');
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
     * @param {import('../domain/level')} level
     */
    constructor(playerRegistry, level) {
        this.playerRegistry = playerRegistry;
        this.level = level;
        logger.debug(`[GameEngine.constructor] Loaded level: ${JSON.stringify(this.level, null, 2)}`);
    }

    update() {
        const players = this.playerRegistry.players.values();
        this.calculateGameStateFor(players);
    }

    calculateGameStateFor(players) {
        for (const player of players) {
            if (player.hasCompletedLevel()) continue; // Si el jugador ya ha completado el nivel, no calculamos su estado
            player.applyPendingInput();
            this.handleHorizontalMovementFor(player);
            this.handleVerticalMovementFor(player);
            player.getGameState().hitbox.updateHitboxPosition(player.getGameState().x, player.getGameState().y);
            this.handleKeyCollectionFor(player);
            this.handleDoorInteractionFor(player);
            //logger.debug(`[GameEngine.calculateGameStateFor] player AFTER update --> ${player.toString()}`);
        }
    }

    handleHorizontalMovementFor(player) {
        const playerGameState = player.getGameState();
        const currentX = playerGameState.x;    
        const appliedSpeed = player.hasKey() ?
            this.speed * 0.5
            : this.speed;        
        const newX = currentX + (playerGameState.isMovingLeft ? -appliedSpeed : 0) + (playerGameState.isMovingRight ? appliedSpeed : 0);
        const hitboxWithNewX = new Hitbox(newX, playerGameState.y, playerGameState.width, playerGameState.height, playerGameState.hitbox.anchorX, playerGameState.hitbox.anchorY);
        if (this.hitboxDoesNotIntersectWithAnyOtherHitbox(player.getId(), hitboxWithNewX, true)) {
            playerGameState.x = newX;
        }
    }

    handleVerticalMovementFor(player) {
        const playerGameState = player.getGameState();
        const currentY = playerGameState.y;
        let isPlayerInAir = !this.hitboxIntesectsWithGrounds(playerGameState.hitbox);
        // Comprobar qué hacer con 'Y' y verticalSpeed en casos específicos
        if (playerGameState.canJump && playerGameState.isJumping) { // Si puede saltar y salta...
            playerGameState.verticalSpeed = -1 * this.jumpSpeed;
            playerGameState.canJump = false;
        } else if (isPlayerInAir) {
            playerGameState.verticalSpeed += this.acceleration;
        }
        // Calcular nuevos valores        
        const newY = currentY + playerGameState.verticalSpeed;
        const hitboxWithNewY = new Hitbox(playerGameState.x, newY, playerGameState.width, playerGameState.height, playerGameState.hitbox.anchorX, playerGameState.hitbox.anchorY);
        isPlayerInAir = isPlayerInAir && !this.hitboxIntesectsWithGrounds(hitboxWithNewY);
        // Decidir qué cambios aplicar al gamestate
        if (this.hitboxDoesNotIntersectWithAnyOtherHitbox(player.getId(), hitboxWithNewY) && isPlayerInAir) { // Si el jugador NO choca con otra entidad y está en el aire...
            playerGameState.y = newY;
            playerGameState.canJump = false;
        } else { // Si choca con algo...
            playerGameState.verticalSpeed = 0;
            playerGameState.canJump = true;
        }
        playerGameState.isJumping = false;
    }

    hitboxDoesNotIntersectWithAnyOtherHitbox(playerId, hitbox, horizontalMovement = false) {
        // Jugadores
        const players = this.playerRegistry.players.values();
        for (const player of players) {
            if (player.getId() === playerId) continue;
            const playerHitbox = player.getGameState().hitbox;
            if (hitbox.intersectsWith(playerHitbox)) {
                //logger.debug(`[GameEngine.hitboxDoesNotIntersectWithAnyOtherHitbox] Player ${playerId} has collided with player ${player.getId()}!`);
                return false;
            }
        }
        // Puerta
        if (hitbox.intersectsWith(this.level.getDoorHitbox())) {
            //logger.debug(`[GameEngine.hitboxDoesNotIntersectWithAnyOtherHitbox] Player ${playerId} has reached the door!`);
            const canInteractWithDoor = this.level.isDoorOpen() || this.playerRegistry.getPlayerById(playerId).getGameState().hasKey;
            if (!canInteractWithDoor) {
                //logger.debug(`[GameEngine.hitboxDoesNotIntersectWithAnyOtherHitbox] Player ${playerId} cannot interact with the door because it's closed and they don't have the key!`);
                return false;
            }
        }
        // Paredes invisibles
        for (const invisibleWallHitbox of this.level.getInvisibleWallsHitboxes()) {
            if (hitbox.intersectsWith(invisibleWallHitbox)) {
                //logger.debug(`[GameEngine.hitboxDoesNotIntersectWithAnyOtherHitbox] Player ${playerId} has collided with an invisible wall!`);
                return false;
            }
        }
        if (horizontalMovement) return true; // Si es un movimiento horizontal, no miramos interacciones verticales
        // Suelo
        const intersectsWithGrounds = this.hitboxIntesectsWithGrounds(hitbox);
        if (intersectsWithGrounds) {
            //logger.debug(`[GameEngine.hitboxDoesNotIntersectWithAnyOtherHitbox] Player ${playerId} has collided with the ground!`);
            return false;
        }
        // Zona de muerte
        if (this.level.getDeadZonesHitboxes().length > 0) {
            for (const deadZoneHitbox of this.level.getDeadZonesHitboxes()) {
                if (hitbox.intersectsWith(deadZoneHitbox)) {
                    logger.debug(`[GameEngine.hitboxDoesNotIntersectWithAnyOtherHitbox] Player ${playerId} has collided with a death zone and will be reset to the initial position!`);
                    const player = this.playerRegistry.getPlayerById(playerId);
                    if (player.hasKey()) {
                        player.removeKey();
                        this.level.makeKeyAvailable();
                    }
                    player.resetGameState(this.playerRegistry.getIndexInsideRegistryFor(player)); // Reseteamos el estado del jugador a su posición inicial
                    return false;
                }
            }
        }
        return true;
    }

    hitboxIntesectsWithGrounds(hitbox) {
        for (const groundHitbox of this.level.getGroundHitboxes()) {
            if (hitbox.intersectsWith(groundHitbox)) {
                return true;
            }
        }
        return false;
    }

    handleKeyCollectionFor(player) {
        if (this.level.isKeyTaken()) return;
        const playerHitbox = player.getGameState().hitbox;
        if (playerHitbox.intersectsWith(this.level.getKeyHitbox())) {
            logger.info(`[GameEngine.handleKeyCollectionFor] Player ${player.getId()} has taken the key!`);
            this.level.takeKey();
            player.giveKey();
        }
    }

    handleDoorInteractionFor(player) {
        const playerHitbox = player.getGameState().hitbox;
        if (playerHitbox.intersectsWith(this.level.getDoorHitbox())) {
            //logger.debug(`[GameEngine.handleDoorInteractionFor] Player ${player.getId()} has reached the door!`);
            if (this.level.isDoorOpen()) {
                logger.info(`[GameEngine.handleDoorInteractionFor] Player ${player.getId()} has passed through the open door and completed the level!`);
                player.completeLevel();
            } else if (player.getGameState().hasKey && !this.level.isDoorOpen()) {
                logger.info(`[GameEngine.handleDoorInteractionFor] Player ${player.getId()} has opened the door with the key!`);
                this.level.openDoor();
                player.removeKey();
            } else {
                logger.debug(`[GameEngine.handleDoorInteractionFor] Player ${player.getId()} cannot open the door because it's closed and they don't have the key!`);
            }
        }
    }

    updateLevel(newLevel) {
        this.level = newLevel;
    }
}

module.exports = GameEngine;