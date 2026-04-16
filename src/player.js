class Player {
    /**
     * @param {string} id - Identificador único.
     * @param {string} name - Nombre del jugador.
     * @param {WebSocket} ws - La conexión WebSocket activa.
     */
    constructor(id, name, ws) {
        this.id = id;
        this.name = name;
        this.ws = ws;
    }
}

module.exports = Player;