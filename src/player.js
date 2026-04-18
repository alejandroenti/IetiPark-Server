class Player {
    /**
     * @param {string} id - Identificador único.
     * @param {string} name - Nombre del jugador.
     */


    constructor(id, name) {
        this.id = id;
        this.name = name;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name
        };
    }
}

module.exports = Player;