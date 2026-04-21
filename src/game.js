const GameEngine = require("./gameEngine");

class Game {
    fps = 60;
    frameDuration = 1000 / this.fps;

    constructor(playerRegistry) {
        this.playerRegistry = playerRegistry;
        this.gameEngine = new GameEngine(playerRegistry);
        this.state = 'play'; // wait, play, finish
        this.nextUpdateTime = Date.now();
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