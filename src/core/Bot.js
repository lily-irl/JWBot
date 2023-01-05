import Database from "./Database.js";
import EventBus from "./event/EventBus.js";
import PackageManager from "./PackageManager.js";
import CommandManager from "./CommandManager.js";
import { Events } from "discord.js";
/**
 * The main Bot class. This doesn't instantiate discord.js but
 * it should be passed all of the requisite objects and run the
 * main event loop.
 *
 * @class Bot
 */
export default class Bot {
    /**
     *
     * @constructor
     */
    constructor(client) {
        /**
         * The main event bus. This should be passed to every
         * package and be the only EventBus in use.
         *
         * @property _eventBus
         * @type {EventBus}
         * @private
         */
        this._eventBus = EventBus;

        /**
         * The client object that was provided when we logged the
         * bot in through discord.js.
         *
         * @property _client
         * @private
         */
        this._client = client;

        /**
         * The database connection.
         *
         * @property _database
         * @private
         */
        this._database = Database;

        this.enable();
    }

    /**
     *
     * @method enable
     * @param {String} token
     * @returns {void}
     */
    enable() {
        this._database.enable();
        this._client.on(Events.InteractionCreate, CommandManager.handleInteraction);
    }
}
