import { Collection, REST, Routes } from "discord.js";
import { default as config } from "../../credentials.json" assert { type: 'json' };
/**
 * The CommandManager maintains a list of commands and their
 * associated objects. Whenever a package is loaded, its commands
 * will be sent by the PackageManager to the CommandManager
 */
class CommandManager {
    /**
     *
     * @constructor
     */
    constructor() {
        /**
         * A Collection of every command we currently have
         * registered.
         *
         * @property _commands
         * @type {Collection<String, Command>}
         * @private
         */
        this._commands = new Collection();
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
    }

    /**
     * Whenever an Interaction is received from the discord client,
     * we'll process it as a slash command here.
     *
     * @method handleInteraction
     * @param {Interaction} interaction
     */
    handleInteraction(interaction) {
        if (!interaction.isChatInputCommand()) return;
        console.log(interaction);
    }

    /**
     * Given a list of command names, register all
     * of them with Discord. This should be run only
     * after all modules have been loaded.
     *
     * @method registerCommands
     * @param {String[]} commandNames
     */
    registerCommands(commandNames) {
        if (!commandNames) return;

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
        });
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

export default new CommandManager();
