const { MongoClient } = require('mongodb');
const crypto = require('crypto');

/**
 * Servicio simple para gestionar la conexion a MongoDB.
 * Cómo se usa:
 *   const mongo = new MongoService();
 *   await mongo.connect();
 *   const users = await mongo.getCollection('users');
 *   await mongo.dispose();
 */
class MongoService {
    constructor({ dbName, mongoClientOptions } = {}) {
        this.uri = process.env.MONGODB_URI || 'mongodb://root:password@127.0.0.1:27017/?authSource=admin';
        this.dbName = dbName;
        this.mongoClientOptions = mongoClientOptions || {};
        this.client = null;
        this.db = null;
        this.connectPromise = null;
    }

    async connect() {
        if (this.db) {
            return this.db;
        }

        if (this.connectPromise) {
            return this.connectPromise;
        }

        if (!this.uri) {
            throw new Error('Missing Mongo URI: define MONGODB_URI in environment variables');
        }

        this.connectPromise = (async () => {
            this.client = new MongoClient(this.uri, this.mongoClientOptions);
            await this.client.connect();
            this.db = this.dbName ? this.client.db(this.dbName) : this.client.db();
            return this.db;
        })();

        try {
            return await this.connectPromise;
        } finally {
            this.connectPromise = null;
        }
    }

    async dispose() {
        if (!this.client) {
            return;
        }

        await this.client.close();
        this.client = null;
        this.db = null;
        this.connectPromise = null;
    }

    async disconnect() {
        return this.dispose();
    }

    async getDb() {
        return this.connect();
    }

    async getCollection(collectionName) {
        const db = await this.connect();
        return db.collection(collectionName);
    }

    async createCollection(collectionName, options = {}) {
        const db = await this.connect();
        const exists = await db.listCollections({ name: collectionName }, { nameOnly: true }).hasNext();

        if (!exists) {
            await db.createCollection(collectionName, options);
        }

        return db.collection(collectionName);
    }

    /**
     * Garantiza índices para la colección de players.
     * - `nom` único: evita duplicados por nombre.
     * - `id` único: garantiza identificador estable por jugador.
     */
    async ensurePlayersIndexes() {
        const players = await this.createCollection('players');

        // El índice uq_players_id (sobre el campo `id`) fue creado en una versión anterior
        // y ya no existe ese campo en los documentos. Si sigue presente, todos los documentos
        // nuevos tendrían { id: null } y el índice único los rechazaría a partir del segundo.
        // Lo eliminamos si todavía existe.
        try {
            await players.dropIndex('uq_players_id');
        } catch (_) {
            // Si el índice ya no existe, la excepción se ignora silenciosamente.
        }

        // `_id` ya es único e indexado por MongoDB de forma automática.
        // Solo necesitamos unicidad sobre `nom`.
        await players.createIndex({ nom: 1 }, { unique: true, name: 'uq_players_nom' });
        return players;
    }

    /**
     * Busca un jugador por `nom`. Si no existe, lo crea con un `id` nuevo.
     * Si existe, reutiliza el `id` guardado.
     *
     * @param {string} nom
     * @returns {Promise<{ id: string, nom: string, quantitat_de_partidas: number, created: boolean }>} 
     */
    async findOrCreatePlayerByNom(nom) {
        if (!nom || typeof nom !== 'string') {
            throw new Error('Player name is required to find or create a player');
        }

        const normalizedNom = nom.trim();
        if (!normalizedNom) {
            throw new Error('Player name cannot be empty');
        }

        const players = await this.createCollection('players');
        const generatedId = crypto.randomUUID();

        // Operación atómica: si existe por `nom`, no inserta. Si no existe, crea con `_id` nuevo.
        // Al usar el UUID como `_id`, evitamos tener un campo `id` duplicado junto al `_id` de Mongo.
        const result = await players.findOneAndUpdate(
            { nom: normalizedNom },
            {
                $setOnInsert: {
                    _id: generatedId,
                    nom: normalizedNom,
                    quantitat_de_partidas: 0
                }
            },
            {
                upsert: true,
                returnDocument: 'after'
            }
        );

        const playerDoc = result;
        return {
            id: playerDoc._id,
            nom: playerDoc.nom,
            quantitat_de_partidas: playerDoc.quantitat_de_partidas,
            created: playerDoc._id === generatedId
        };
    }

    /**
     * Incrementa en +1 el contador de partidas superadas para cada jugador indicado.
     *
     * @param {string[]} playerIds
     * @returns {Promise<number>} número de documentos modificados
     */
    async incrementCompletedGamesForPlayers(playerIds) {
        if (!Array.isArray(playerIds) || playerIds.length === 0) {
            return 0;
        }

        const normalizedUniqueIds = [...new Set(
            playerIds
                .filter(id => typeof id === 'string')
                .map(id => id.trim())
                .filter(Boolean)
        )];

        if (normalizedUniqueIds.length === 0) {
            return 0;
        }

        const players = await this.createCollection('players');
        const result = await players.updateMany(
            { _id: { $in: normalizedUniqueIds } },
            { $inc: { quantitat_de_partidas: 1 } }
        );

        return result.modifiedCount;
    }
}

module.exports = MongoService;