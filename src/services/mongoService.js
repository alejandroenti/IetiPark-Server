const { MongoClient } = require('mongodb');

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
}

module.exports = MongoService;