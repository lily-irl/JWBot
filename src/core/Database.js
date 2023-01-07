import { default as config } from "../../credentials.json" assert { type: 'json' };
import mysql from "mysql";
/**
 * Represents the database to the bot.
 */
class Database {
    /**
     *
     * @constructor
     */
    constructor() {
        /**
         * Flag that determines whether or not the `Bot` class
         * has enabled the connection yet.
         *
         * @property _ready
         * @type {Boolean}
         * @default false
         * @private
         */
        this._ready = false;

        /**
         * Represents the connection to the database. This
         * will be `null` until the connection is actually enabled,
         * so it is imperative calls to this class check whether or
         * not `ready` is true.
         *
         * @property _connection
         * @default null
         * @private
         */
        this._connection = null;
    }

    /**
     * Is the connection ready to be used?
     *
     * @property ready
     * @type {Boolean}
     */
    get ready() {
        return this._ready;
    }

    /**
     * When the Bot is loaded, it should call this method
     * to attempt connection to the database.
     * 
     * A connection failure is a fatal error and the bot
     * should be terminated.
     * 
     * Ensure that the values in `credentials.json` are set!
     *
     * @method enable
     * @returns {void}
     */
    enable() {
        this._connection = mysql.createConnection({
            host: config.MYSQL.HOST,
            user: config.MYSQL.USER,
            password: config.MYSQL.PASSWORD,
            database: config.MYSQL.DATABASE,
            charset: 'utf8mb4'
        });

        this._connection.connect();

        this._ready = true;
    }

    /**
     * Gracefully closes the connection. Calling this is good practise.
     *
     * @method disable
     * @returns {void}
     */
    disable() {
        this._connection.end();
        this._ready = false;
        this.query("foo", () => {bar})
    }

    /**
     * Execute a query. Please listen closely as our parameters have recently changed.
     *
     * @method query
     * @param {String} queryString - the SQL query, with values optionally escaped with `?`
     * @param {Function} callback - returns three parameters, (error, results, fields).
     * @param {String[]} values - the escaped values, if any
     */
    query(queryString, callback, values = []) {
        this._connection.query(queryString, values, callback);
    }
}

export default new Database();
