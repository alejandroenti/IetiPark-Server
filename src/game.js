const GameEngine = require("./engine/gameEngine");
const PlayerRegistry = require("./domain/playerRegistry");
const Level = require("./domain/level");

class Game {
    fps = 60;
    frameDuration = 1000 / this.fps;

    constructor() {
        this.playerRegistry = new PlayerRegistry();
        this.state = 'play'; // wait, play, finish
        this.FirstLevel = new Level('first_level');
        // TODO this.SecondLevel = new Level('second_level');
        this.currentLevel = this.FirstLevel;
        this.gameEngine = new GameEngine(this.playerRegistry, this.currentLevel);
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
                return;
            }
            this.gameEngine.update();
            const allPlayersCompletedLevel = this.playerRegistry.getPlayersSnapshot().every(player => player.getGameState().hasCompletedLevel);
            if (allPlayersCompletedLevel) {
                console.log('All players have completed the level!');
                process.exit(0);
            }
        }
    }
}

module.exports = Game;