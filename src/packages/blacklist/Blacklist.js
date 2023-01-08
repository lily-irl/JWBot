import { Events } from "discord.js";
import ServerList from "./ServerList.js";

/**
 * Creates a word blacklist. Uses of blacklisted
 * words will be logged.
 */
export default class Blacklist {
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

        /**
         * The blacklist itself in memory
         *
         * @property _blacklist
         * @type {Map<String, ServerList>}
         */
        this._blacklist = new Map();

        this.enable();
    }

    /**
     * Getter for the `_blacklist`
     *
     * @property blacklist
     * @type {Map<String, ServerList>}
     */
    get blacklist() {
        return this._blacklist;
    }

    /**
     * Creates database schemas if not already done.
     * Loads blacklisted words into memory.
     *
     * @method enable
     * @returns {void}
     */
    enable() {
        this._database.query('CREATE TABLE IF NOT EXISTS Blacklist (id VARCHAR(30) NOT NULL, regex VARCHAR(500) NOT NULL, CONSTRAINT PK_blacklist PRIMARY KEY (id, regex));',
        (error, results, fields) => {
            if (error) console.error(error);
        })

        this._database.query('ALTER TABLE Servers ADD `blacklistLog` VARCHAR(30);',
                            (error, results, fields) => { if (error) return; })

        this._database.query('SELECT id FROM Blacklist GROUP BY id;', (error, results, fields) => {
            if (error) {
                console.error(error);
                return;
            }

            if (!results || results.length === 0) return;

            for (let result of results) {
                this._blacklist.set(result.id, new ServerList(this._client, this._database, result.id));
            }
        });

        this.setupHandlers();
    }

    /**
     * Sets up the listeners for the message send
     * and mute events from the discord client.
     *
     * @method setupHandlers
     * @returns {void}
     */
    setupHandlers() {
        const createHandler = this.handleMessageCreate.bind(this);
        const editHandler = this.handleMessageEdit.bind(this);
        const addHandler = this.handleBlacklistAdd.bind(this);
        const removeHandler = this.handleBlacklistRemove.bind(this);
        const queryHandler = this.handleBlacklistQuery.bind(this);
        
        this._client.on(Events.MessageCreate, createHandler);
        this._client.on(Events.MessageUpdate, editHandler);

        this._eventBus.on('blacklist add', addHandler);
        this._eventBus.on('blacklist remove', removeHandler);
        this._eventBus.on('blacklist query', queryHandler);
    }

    /**
     * Message handler
     *
     * @method handleMessageCreate
     * @param {Message} message
     * @returns {void}
     */
    handleMessageCreate(message) {
        const serverList = this._blacklist.get(message.guildId);

        if (!serverList) return;

        serverList.messageEventHandler(message);
    }
    
    /**
     * Edit handler
     *
     * @method handleMessageEdit
     * @param {Message} oldMessage
     * @param {Message} newMessage
     * @returns {void}
     */
    handleMessageEdit(oldMessage, newMessage) {
        const serverList = this._blacklist.get(newMessage.guildId);

        if (!serverList) return;

        serverList.messageEventHandler(newMessage);
    }

    /**
     * Handles a blacklist add request.
     *
     * @method handleBlacklistAdd
     * @param {String} id - the server
     * @param {String} regex - the expression
     * @returns {void}
     */
    handleBlacklistAdd(id, regex) {
        let serverList = this._blacklist.get(id);

        if (!serverList) {
            this._blacklist.set(id, new ServerList(this._client, this._database, id));
            this.handleBlacklistAdd(id, regex);
            return;
        }

        serverList.add(regex);
    }

    /**
     * Handles a blacklist remove request.
     *
     * @method handleBlacklistRemove
     * @param {String} id - the server
     * @param {String} regex - the expression
     * @returns {void}
     */
    handleBlacklistRemove(id, regex) {
        const serverList = this._blacklist.get(id);

        if (!serverList) return;

        serverList.remove(regex);
    }

    /**
     * Handles a request for a server blacklist, passing it to a callback
     *
     * @method handleBlacklistQuery
     * @param {String} id
     * @param {Function} callback
     * @returns {void}
     */
    handleBlacklistQuery(id, callback) {
        const serverList = this._blacklist.get(id);

        if (!serverList) return callback(null);

        callback(serverList.blacklist);
    }
}