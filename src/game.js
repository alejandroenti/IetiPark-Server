const GameEngine = require("./engine/gameEngine");
const PlayerRegistry = require("./domain/playerRegistry");
const Level = require("./domain/level");
const logger = require("./logger");

class Game {
    fps = 60;
    frameDuration = 1000 / this.fps;

    constructor() {
        this.playerRegistry = new PlayerRegistry();
        this.state = 'play'; // wait, play, finish
        this.FirstLevel = new Level('first_level');
        this.SecondLevel = new Level('second_level');
        this.currentLevel = this.SecondLevel;
        this.levelJustChanged = false;
        this.gameEngine = new GameEngine(this.playerRegistry, this.currentLevel);
        this.allPlayersJustDisconnected = false;
    }

    getPlayerRegistry() {
        return this.playerRegistry;
    }

    getPlayersGameStates() {
        const playersSnapshot = this.playerRegistry.getPlayersSnapshot();
        return playersSnapshot.map(player => ({
            name: player.name,
            x: player.getGameState().x,
            y: player.getGameState().y,
            isMovingLeft: player.getGameState().isMovingLeft,
            isMovingRight: player.getGameState().isMovingRight,
            isJumping: player.getGameState().isJumping,
            hasKey: player.getGameState().hasKey,
            hasCompletedLevel: player.getGameState().hasCompletedLevel
        }));
    }

    wait() {
        if (this.state === 'play' || this.state === 'finish') {
            this.state = 'wait';
        }
    }

    start() {
        if (this.state === 'wait') {
            this.state = 'play';
        }
    }

    finish() {
        if (this.state === 'play') {
            this.state = 'finish';
        }
    }

    isWaiting() {
        return this.state === 'wait';
    }

    isPlaying() {
        return this.state === 'play';
    }

    isFinished() {
        return this.state === 'finish';
    }

    update() {
        if (this.isPlaying()) {
            const thereArePlayers = this.playerRegistry.getPlayersSnapshot().length > 0;
            if (!thereArePlayers) {
                if (this.allPlayersJustDisconnected) {
                    logger.info('All players have disconnected. Resetting the game to the first level.');
                    this.currentLevel = this.FirstLevel;
                    this.currentLevel.reset();
                    this.gameEngine.updateLevel(this.currentLevel);
                    this.allPlayersJustDisconnected = false;
                }
                return;
            }
            this.allPlayersJustDisconnected = true;
            this.gameEngine.update();
            const allPlayersCompletedLevel = this.playerRegistry.getPlayersSnapshot().every(player => player.getGameState().hasCompletedLevel);
            if (allPlayersCompletedLevel) {
                logger.info('All players have completed the level!');
                this.handleChangingLevel();
            }
        }
    }
    
    handleChangingLevel() {
        this.changeCurrentLevelToNext();
        logger.debug(`[Game.handleChangingLevel] Current level is now: ${this.currentLevel.getName()}`);
        this.playerRegistry.resetGameStatesForAllPlayers();
        logger.debug('[Game.handleChangingLevel] All player game states have been reset for the new level.');
        for (const player of this.playerRegistry.getPlayersSnapshot()) {
            logger.debug(`[Game.handleChangingLevel] Player state after reset: ${player.toString()}`);
        }
    }

    changeCurrentLevelToNext() {
        if (this.currentLevel === this.FirstLevel) {
            this.currentLevel = this.SecondLevel;
        } else {
            this.currentLevel = this.FirstLevel;
        }
        this.currentLevel.reset();
        logger.debug(`[Game.changeCurrentLevelToNext] Loaded level: ${JSON.stringify(this.currentLevel, null, 2)}`);
        this.gameEngine.updateLevel(this.currentLevel);
        this.levelJustChanged = true;
    }
}

module.exports = Game;