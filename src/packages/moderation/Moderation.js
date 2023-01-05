/**
 * The Moderation module provides kick, mute, and ban
 * functionality across a moderation network. 
 */
export default class Moderation {
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
     * Ensures the database is ready and contains the tables relevant
     * to this module: Bans, Mutes, and ModerationNetworks.
     *
     * @method enable
     * @returns {void}
     */
    enable() {
        if (!this._database.ready) return;

        this._database.query('CREATE TABLE IF NOT EXISTS Bans (id VARCHAR(30) PRIMARY KEY, reason VARCHAR(1000), expires VARCHAR(16));',
                            (error, results, fields) => { if (error) console.error(error); });
        this._database.query('CREATE TABLE IF NOT EXISTS Mutes (id VARCHAR(30) PRIMARY KEY, reason VARCHAR(1000), expires VARCHAR(16));',
                            (error, results, fields) => { if (error) console.error(error); });
        this._database.query('CREATE TABLE IF NOT EXISTS ModerationNetworks (id VARCHAR(30) PRIMARY KEY, network VARCHAR(50) NOT NULL);',
                            (error, results, fields) => { if (error) console.error(error); });
        // don't need to worry about IF NOT EXISTS for this one because if it does
        // it'll just fail and we can carry on
        this._database.query('ALTER TABLE Servers ADD `muteLog` VARCHAR(16);',
                            (error, results, fields) => { if (error) console.error(error); })
        this._database.query('ALTER TABLE Servers ADD `modLog` VARCHAR(16);',
                            (error, results, fields) => { if (error) console.error(error); })

        this.registerEvents();
        this.loadExistingBans();
        this.loadExistingMutes();
    }

    /**
     * Setup event handlers for mutes, bans, and kicks so that
     * they can be executed across the entire network
     *
     * @method registerEvents
     * @returns {void}
     */
    registerEvents() {
        const muteHandler = this.muteHandler.bind(this);
        const banHandler = this.banHandler.bind(this);
        const kickHandler = this.kickHandler.bind(this);

        this._eventBus.on('mute', muteHandler);
        this._eventBus.on('ban', banHandler);
        this._eventBus.on('kick', kickHandler);
    }

    /**
     * Load any existing bans from the database.
     * If they've expired since the Moderation object existed,
     * we'll unban the user in question.
     *
     * @method loadExistingBans
     * @returns {void}
     */
    loadExistingBans() {
        
    }

    /**
     * Load any existing bans from the database.
     * If they've expired since the Moderation object existed,
     * we'll unmute the user in question.
     *
     * @method loadExistingMutes
     * @returns {void}
     */
    loadExistingMutes() {

    }

    /**
     * Handles a mute. Expects a Mute object.
     *
     * @method muteHandler
     * @param {Mute} mute
     */
    muteHandler(mute) {

    }

    /**
     * Handles a ban. Expects a Ban object.
     *
     * @method banHandler
     * @param {Ban} ban
     */
    banHandler(ban) {

    }

    /**
     * Handles a kick. Expects a Kick object.
     *
     * @method kickHandler
     * @param {Kick} kick
     */
    kickHandler(kick) {

    }
}
