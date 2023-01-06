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

        /**
         * The package manager
         *
         * @property _packageManager
         * @type {PackageManager}
         * @private
         */
        this._packageManager = null;

        /**
         * The command manager
         *
         * @property _commandManager
         * @type {CommandManager}
         * @private
         */
        this._commandManager = null;

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
        this._commandManager = new CommandManager(this._eventBus, this._database);
        this._packageManager = new PackageManager(this._client, this._database, this._eventBus, this._commandManager);

        this._client.on(Events.InteractionCreate, this._commandManager.interactionHandler);
        this._packageManager.loadPackages();

        console.log('JWBot is enabled.')
    }
}
