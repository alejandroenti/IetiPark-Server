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
        // Palanca
        this.lever = this.level.sprites.filter(sprite => sprite.name === 'lever');
        this.leverHitbox = [];
        if (this.lever.length > 0) {
            this.leverHitbox = this.lever.map(lever => new Hitbox(lever.x, lever.y, 0.16*lever.width, 0.50*lever.height, 0.5, 0.5)); // 0.16 y 0.50 son para ajustar el hitbox a la parte interactiva de la palanca, que es más pequeña que la imagen completa
        }
        this._isLeverActivated = false;
        // Zona de muerte
        this.deadZones = this.level.zones.filter(zone => zone.name === 'dead_zone');
        this.deadZonesHitboxes = [];
        if (this.deadZones.length > 0) {
            this.deadZonesHitboxes = this.deadZones.map(zone => new Hitbox(zone.x, zone.y, zone.width, zone.height, 0, 0));
        }
    }

    getName() {
        return this.level.levelName;
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

    getDeadZonesHitboxes() {
        return this.deadZonesHitboxes;
    }

    isKeyTaken() {
        return this._isKeyTaken;
    }

    takeKey() {
        this._isKeyTaken = true;
    }

    makeKeyAvailable() {
        this._isKeyTaken = false;
    }

    isDoorOpen() {
        return this._isDoorOpen;
    }

    openDoor() {
        this._isDoorOpen = true;
    }

    closeDoor() {
        this._isDoorOpen = false;
    }

    isLeverActivated() {
        return this._isLeverActivated;
    }

    activateLever() {
        this._isLeverActivated = true;
    }

    resetLever() {
        this._isLeverActivated = false;
    }

    getCurrentLevelState() {
        return {
            name: this.getName(),
            isDoorOpen: this.isDoorOpen(),
            isKeyTaken: this.isKeyTaken(),
            isLeverActivated: this.isLeverActivated()
        };
    }

    reset() {
        this.makeKeyAvailable();
        this.resetLever();
        this.closeDoor();
    }
}

module.exports = Level;