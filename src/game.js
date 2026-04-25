const GameEngine = require("./engine/gameEngine");
const PlayerRegistry = require("./domain/playerRegistry");

class Game {
    fps = 60;
    frameDuration = 1000 / this.fps;

    constructor() {
        this.playerRegistry = new PlayerRegistry();
        this.gameEngine = new GameEngine(this.playerRegistry);
        this.state = 'play'; // wait, play, finish
        this.nextUpdateTime = Date.now();
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
            hasKey: player.getGameState().hasKey
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
            this.gameEngine.update();
        }
    }
}

module.exports = Game;