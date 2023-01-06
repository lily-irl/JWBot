import schedule from "node-schedule";

/**
 * Represents a Ban. If the ban is time-limited, a scheduler job
 * will be created to remove the ban.
 */
export default class Ban {
    /**
     *
     * @param {Client} client
     * @param {Database} database
     * @param {String} userId
     * @param {String} reason
     * @param {Date} expires
     * @constructor
     */
    constructor(client, database, userId, reason = "", expires = null) {
        /**
         * The discord client.
         *
         * @property _client
         * @type {Client}
         * @private
         */
        this._client = client;

        /**
         * The database connection.
         *
         * @property _database
         * @type {Database}
         * @private
         */
        this._database = database;

        /**
         * The ID of the User who was banned.
         *
         * @property _id
         * @type {String}
         * @private
         */
        this._id = userId;

        /**
         * The reason this user was banned, if any.
         *
         * @property _reason
         * @type {String}
         * @private
         */
        this._reason = reason;

        /**
         * The date that this ban expires, or `null` if it
         * does not expire.
         *
         * @property _expires
         * @type {Date}
         * @private
         */
        this._expires = expires;

        this.enable();
    }

    /**
     * Creates the scheduler job to unban the user.
     *
     * @method enable
     * @returns {void}
     */
    enable() {

    }

    // Getters and setters follow
    // Can't really be fucked doing the full documentation thing

    get id() {
        return this._id;
    }

    get reason() {
        return this._reason;
    }

    get expires() {
        return this._expires;
    }
}
