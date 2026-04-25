const { loadMultiplayerLevel } = require("../multiplayerLevelData");
const Hitbox = require("../engine/hitbox");

class Level {
    constructor(levelName) {
        // Cargar el JSON entero del nivel
        this.level = loadMultiplayerLevel(levelName);
        // Suelos
        this.grounds = this.level.zones.filter(zone => zone.name === 'ground');
        this.groundHitboxes = this.grounds.map(ground => new Hitbox(ground.x, ground.y, ground.width, ground.height, 0, 0));
        // Puerta
        this.door = this.level.sprites.find(sprite => sprite.name === 'door');
        this.doorHitbox = new Hitbox(this.door.x, this.door.y, this.door.width, this.door.height, 0.5, 0.5);
        this._isDoorOpen = false;
        // Paredes invisibles
        this.invisibleWalls = this.level.zones.filter(zone => zone.name.startsWith('invisible_wall'));
        this.invisibleWallsHitboxes = this.invisibleWalls.map(wall => new Hitbox(wall.x, wall.y, wall.width, wall.height, 0, 0));
        // Llave
        this.key = this.level.sprites.find(sprite => sprite.name === 'key');
        this.keyHitbox = new Hitbox(this.key.x, this.key.y, this.key.width, this.key.height, 0.5, 0.5);
        this._isKeyTaken = false;
    }

    getGroundHitboxes() {
        return this.groundHitboxes;
    }

    getDoorHitbox() {
        return this.doorHitbox;
    }

    getInvisibleWallsHitboxes() {
        return this.invisibleWallsHitboxes;
    }

    getKeyHitbox() {
        return this.keyHitbox;
    }

    isKeyTaken() {
        return this._isKeyTaken;
    }

    takeKey() {
        this._isKeyTaken = true;
    }

    isDoorOpen() {
        return this._isDoorOpen;
    }

    openDoor() {
        this._isDoorOpen = true;
    }
}

module.exports = Level;