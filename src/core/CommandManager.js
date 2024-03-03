import { Collection, REST, Routes } from "discord.js";
import { default as config } from "../../credentials.json" assert { type: 'json' };
/**
 * The CommandManager maintains a list of commands and their
 * associated objects. Whenever a package is loaded, its commands
 * will be sent by the PackageManager to the CommandManager
 */
export default class CommandManager {
    /**
     *
     * @param {EventBus} eventBus
     * @param {Database} database
     * @constructor
     */
    constructor(eventBus, database) {
        /**
         * A Collection of every command we currently have
         * registered.
         *
         * @property _commands
         * @type {Collection<String, Command>}
         * @private
         */
        this._commands = new Collection();

        /**
         * Guess what, we're passing the EventBus to the command handlers
         *
         * @property _eventBus
         * @type {EventBus}
         * @private
         */
        this._eventBus = eventBus;

        /**
         * The database connection
         *
         * @property _database
         * @type {Database}
         * @private
         */
        this._database = database;

        /**
         * The interaction handler, a bound function that
         * MUST be used instead of calling _handleInteraction()
         * directly.
         *
         * @property interactionHandler
         * @type {Function}
         * @async
         */
        this.interactionHandler = null;

        /**
         * This listens for a signal to register all commands.
         *
         * @property registrationListener
         * @type {Function}
         */
        this.registrationListener = null;

        this.setupHandlers()
    }

    /**
     * Creates the interaction handler
     *
     * @method setupHandlers
     * @returns {void}
     */
    setupHandlers() {
        this.interactionHandler = this._handleInteraction.bind(this);
        this.registrationListener = this.registerCommands.bind(this);

        this._eventBus.on('register commands', this.registrationListener);
    }

    /**
     * Get a command by its name
     *
     * @method get
     * @param {String} name
     * @returns {Command}
     */
    get(name) {
        return this._commands.get(name);
    }

    /**
     * Adds a command to the collection. This may not be removed.
     *
     * @method add
     * @param {String} name
     * @param {Command} command
     */
    add(name, command) {
        this._commands.set(name, command);
        console.log('Added command ' + name);
    }

    /**
     * Whenever an Interaction is received from the discord client,
     * we'll process it as a slash command here.
     *
     * @method _handleInteraction
     * @param {Interaction} interaction
     * @async
     */
    async _handleInteraction(interaction) {
        if (interaction.isChatInputCommand()) {
        
            const command = this._commands.get(interaction.commandName);

            // Ensure there's a database entry for this server
            this._database.query(`SELECT id FROM Servers WHERE id = '${interaction.guildId}'`, (error, results, fields) => {
                if (error) console.error(error);

                if (results.length === 0) {
                    this._database.query('INSERT INTO Servers (id) VALUES (?)', (error, results, fields) => {
                        if (error) return console.error(error);
                        this._eventBus.trigger('new server', interaction.guildId);
                    }, interaction.guildId);
                }
            });

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
		        return;
            }

            try {
                await command.execute(interaction, this._eventBus, this._database);
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: 'There was an internal error while executing this command', ephemeral: true });
            }
        } else if (interaction.isAutocomplete()) {
            const command = this._commands.get(interaction.commandName);

            if (!command) {
			    console.error(`No command matching ${interaction.commandName} was found.`);
			    return;
		    }

		    try {
			    await command.autocomplete(interaction);
		    } catch (error) {
			    console.error(error);
		    }
        }
    }

    /**
     * Given a list of command names, register all
     * of them with Discord. This should be run only
     * after all modules have been loaded.
     *
     * @method registerCommands
     */
    registerCommands() {
        const commandNames = this._commands.keys();

        const clientId = config.DISCORD.CLIENT_ID;
        const token = config.DISCORD.TOKEN;
        const commands = [];

        for (let name of commandNames) {
            commands.push(this.get(name).data.toJSON());
        }

        const rest = new REST({ version: '10' }).setToken(token);
        (async () => {
            try {
                console.log('Registering ' + commands.length + ' commands.');

                const data = await rest.put(
                    Routes.applicationCommands(clientId),
                    { body: commands }
                );

                console.log(`Registered ${data.length} commands.`)
            } catch (err) {
                console.error(err);
            }
        })();
    }

    /**
     * Unregisters all application commands. Obviously a bit of
     * a nuclear option, so this shouldn't be run unless absolutely
     * necessary.
     *
     * @method unregisterCommands
     */
    unregisterCommands() {
        const clientId = config.DISCORD.CLIENT_ID;
        const token = config.DISCORD.TOKEN;

        const rest = new REST({ version: '10' }).setToken(token);
        (async () => {
            try {
                console.log('Unregistering all commands.');

                const data = await rest.put(
                    Routes.applicationCommands(clientId),
                    { body: [] }
                );

                console.log('Unregistered all commands.')
            } catch (err) {
                console.error(err);
            }
        });
    }
}
