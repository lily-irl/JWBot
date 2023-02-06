import schedule from "node-schedule";

/**
 * Represents a Ban. If the ban is time-limited, a scheduler job
 * will be created to remove the ban.
 */
export default class Ban {
    /**
     *
     * @param {EventBus} eventBus
     * @param {String} userId
     * @param {String} server
     * @param {String} reason
     * @param {Date} expires
     * @constructor
     */
    constructor(eventBus, userId, server, reason, expires = null) {
        /**
         * The event bus.
         *
         * @property _eventBus
         * @type {EventBus}
         * @private
         */
        this._eventBus = eventBus;

        /**
         * The ID of the banned user
         *
         * @property _id
         * @type {String}
         * @private
         */
        this._id = userId;

        /**
         * The ID of the server the user is banned from
         *
         * @property _server
         * @type {String}
         * @private
         */
        this._server = server;

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

        /**
         * The scheduler job to unban the user
         *
         * @property _job
         * @private
         */
        this._job = null;

        this.enable();
    }

    /**
     * Creates the scheduler job to unban the user.
     *
     * @method enable
     * @returns {void}
     */
    enable() {
        if (this._expires) {
            this._job = schedule.scheduleJob(this._expires, function () {
                this._eventBus.trigger('unban', this._id, this._server);
            }.bind(this));
        }
    }

    /**
     * Destroys any scheduler job that exists
     *
     * @method destroy
     * @returns {void}
     */
    destroy() {
        if (this._job) {
            this._job.cancel();
        }
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

    get server() {
        return this._server;
    }
}
