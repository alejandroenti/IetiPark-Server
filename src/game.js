class Game {
    constructor() {
        this.state = 'wait'; // wait, play, finish
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
}

module.exports = Game;