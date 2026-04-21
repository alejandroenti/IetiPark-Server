class Hitbox {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    intersects(otherHitbox) {
        return !(this.x + this.width < otherHitbox.x ||
                 this.x > otherHitbox.x + otherHitbox.width ||
                 this.y + this.height < otherHitbox.y ||
                 this.y > otherHitbox.y + otherHitbox.height);
    }
}

module.exports = Hitbox;