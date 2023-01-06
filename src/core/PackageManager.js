import path from "path";
import fs from "fs";
import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

/**
 * The PackageManager loads packages found in the `packages` folder
 * and is responsible for instantiating them, passing the EventBus,
 * registering commands, and doing other things you'd reasonably
 * expect from a class called `PackageManager`.
 */
export default class PackageManager {
    /**
     * 
     * @param {Client} client
     * @param {Database} database
     * @param {EventBus} eventBus
     * @param {CommandManager} commandManager
     * @constructor
     */
    constructor(client, database, eventBus, commandManager) {
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
         * Our copy of the EventBus that will be passed
         * to every package.
         *
         * @property _eventBus
         * @type {EventBus}
         * @private
         */
        this._eventBus = eventBus;

        /**
         * And finally, the command manager
         *
         * @property _commandManager
         * @type {CommandManager}
         * @private
         */
        this._commandManager = commandManager;

        /**
         * The internal array of packages that we have
         * loaded.
         *
         * @property _packages
         * @type {Package[]}
         * @private
         */
        this._packages = [];
    }

    /**
     * Finds all of the packages loaded into the filesystem.
     * We detect a package if:
     * 
     * - There is a directory in the `src/packages` folder
     * - That directory contains a `package-info.json`
     *
     * If these conditions are met, JWBot assumes there is a valid
     * package and will attempt to load it. A faulty package in that
     * folder will cause issues!
     *
     * @method findPackages
     * @returns {Object[]} the parsed `package-info.json`s
     */
    findPackages() {
        const packageRoot = path.join(__dirname + '../packages');
        const candidates = fs.readdirSync(packageRoot).filter(file => {
            return fs.statSync(packageRoot + '/' + file).isDirectory();
        });
        let packages = [];
        
        for (let candidate of candidates) {
            if (fs.existsSync(path.join(packageRoot, candidate, "package-info.json"))) {
                packages.push(candidate);
            }
        }

        return packages.map(p => {
            const json = fs.readFileSync(path.join(packageRoot, p, "package-info.json"));
            const info = JSON.parse(json);
            info.path = path.join(packageRoot, p);
            return info;
        })
    }

    /**
     * Loads the packages that `findPackages` finds. Loading accomplishes
     * a few things:
     *
     * - The classes specified in `main` of each package-info is instanciated
     * with the client, database, and event bus
     * - The commands specified are registered
     *
     * @method loadPackages
     * @returns {void}
     */
    loadPackages() {
        const packages = this.findPackages();
        for (let p of packages) {
            this.loadPackage(p);
        }
    }

    /**
     * Loads a single package, given the parsed package-info.
     *
     * @method loadPackage
     * @param {Object} info
     */
    async loadPackage(info) {
        console.log(`Loading package ${info.name}...`);

        // Load commands
        if (info.commands.length > 0) {
            for (let cmd of info.commands) {
                const commandPath = url.pathToFileURL(path.join(info.path, 'commands', cmd + '.js'));
                let command;

                try {
                    command = await import(commandPath);
                } catch (error) {
                    console.error(error);
                    return;
                }

                if ('data' in command && 'execute' in command) {
                    this._commandManager.add(cmd, command);
                }
            }
        }

        // Load main file
        const mainPath = url.pathToFileURL(path.join(info.path, info.main));
        let pkg;

        try {
            pkg = await import(mainPath);
        } catch (error) {
            console.error(error);
            return;
        }
        
        const MainClass = pkg.default;

        this._packages.push({
            info: info,
            main: new MainClass(this._client, this._eventBus, this._database)
        });

        console.log(`Package ${info.name} loaded.`);
    }
}
