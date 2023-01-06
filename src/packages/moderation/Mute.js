import schedule from "node-schedule";

/**
 * Represents a Mute. If the mute is time-limited, a scheduler job
 * will be created to remove the mute.
 */
export default class Mute {
    /**
     *
     * @param {EventBus} eventBus
     * @param {String} userId
     * @param {String} server
     * @param {String} reason
     * @param {Date} expires
     * @param {String[]} roles
     * @constructor
     */
    constructor(eventBus, userId, server, reason, expires = null, roles) {
        /**
         * The event bus.
         *
         * @property _eventBus
         * @type {EventBus}
         * @private
         */
        this._eventBus = eventBus;

        /**
         * The ID of the muted user
         *
         * @property _id
         * @type {String}
         * @private
         */
        this._id = userId;

        /**
         * The ID of the server the user is muted in
         *
         * @property _server
         * @type {String}
         * @private
         */
        this._server = server;

        /**
         * The reason this user was muted, if any.
         *
         * @property _reason
         * @type {String}
         * @private
         */
        this._reason = reason;

        /**
         * The date that this mute expires, or `null` if it
         * does not expire.
         *
         * @property _expires
         * @type {Date}
         * @private
         */
        this._expires = expires;

        /**
         * The scheduler job to unmute the user
         *
         * @property _job
         * @private
         */
        this._job = null;

        /**
         * The roles this user had when they were muted
         *
         * @property _roles
         * @private
         */
        this._roles = roles;

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
                this._eventBus.trigger('unmute', this._id, this._server);
            }.bind(this));
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

    get roles() {
        return this._roles;
    }
}
