export default class Configuration {
    /**
     * 
     * @param {Client} client 
     * @param {Database} database 
     * @param {EventBus} eventBus 
     * @constructor
     */
    constructor(client, database, eventBus) {
        /**
         * The discord client
         *
         * @property _client
         * @type {Client}
         * @private
         */
        this._client = client;

        /**
         * The database connection
         *
         * @property _database
         * @type {Database}
         * @private
         */
        this._database = database;
        
        /**
         * The event bus
         *
         * @property _eventBus
         * @type {EventBus}
         * @private
         */
        this._eventBus = eventBus;

        this.enable();
    }

    /**
     * Sets up various database schemas to ensure the
     * bot functions properly
     *
     * @method enable
     * @returns {void}
     */
    enable() {
        // Create the Server table if it doesn't already exist
        this._database.query('CREATE TABLE IF NOT EXISTS Servers (id VARCHAR(30) PRIMARY KEY);', (error, results, fields) => {
            if (error) console.error(error);
        });
        this._database.query('ALTER TABLE Servers ADD `network` VARCHAR(50);',
        (error, results, fields) => { if (error) return; })
    }
}
