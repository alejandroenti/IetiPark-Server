class Hitbox {
    constructor(x, y, width, height, anchorX, anchorY) {
        this.x = x;
        this.y = y;
        this.anchorX = anchorX;
        this.anchorY = anchorY;
        this.width = width;
        this.height = height;
    }

    intersectsWith(otherHitbox) {
        const thisLeft = this.x - this.width * this.anchorX;
        const thisRight = this.x + this.width * (1 - this.anchorX);
        const thisTop = this.y - this.height * this.anchorY;
        const thisBottom = this.y + this.height * (1 - this.anchorY);

        const otherLeft = otherHitbox.x - otherHitbox.width * otherHitbox.anchorX;
        const otherRight = otherHitbox.x + otherHitbox.width * (1 - otherHitbox.anchorX);
        const otherTop = otherHitbox.y - otherHitbox.height * otherHitbox.anchorY;
        const otherBottom = otherHitbox.y + otherHitbox.height * (1 - otherHitbox.anchorY);

        return !(thisRight < otherLeft || thisLeft > otherRight || thisBottom < otherTop || thisTop > otherBottom);
    }

    updateHitboxPosition(newX, newY) {
        this.x = newX;
        this.y = newY;
    }
}

module.exports = Hitbox;