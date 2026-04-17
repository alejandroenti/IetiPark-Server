class Player {
    /**
     * @param {string} id - Identificador único.
     * @param {string} name - Nombre del jugador.
     * @param {import('ws').WebSocket} ws - La conexión WebSocket activa.
     */


    constructor(id, name, ws) {
        this.id = id;
        this.name = name;
        this.ws = ws;
    }

    toJSON() {
        return {
            name: this.name
        };
    }
}

module.exports = Player;