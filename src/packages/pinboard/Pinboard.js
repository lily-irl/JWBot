import { Events, EmbedBuilder } from "discord.js";
import Server from "./Server.js";

/**
 * Oversight logs message edits and deletions.
 */
export default class Oversight {
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
         * A map of servers so we don't have to keep
         * querying the database on each message
         *
         * @property _servers
         * @type {Map<String, Server>}
         * @private
         */
        this._servers = new Map();

        /**
         * All active collectors, by message ID.
         *
         * @property _collectors
         * @type {Map<String, Object>}
         * @private
         */
        this._collectors = new Map();

        /**
         * Handler for a single reaction being collected
         *
         * @property _reactionHandler
         * @type {Function}
         * @private
         */
        this._reactionHandler = null;

        /**
         * Handler for when a collection is complete
         *
         * @property _collectionDoneHandler
         * @type {Function}
         * @private
         */
        this._collectionDoneHandler = null;

        this.enable();
    }

    /**
     * Sets up the database basically
     *
     * @method enable
     * @returns {void}
     */
    enable() {
        this._database.query('CREATE TABLE IF NOT EXISTS Pins (id VARCHAR(30) NOT NULL, server VARCHAR(30) NOT NULL, pins INT, CONSTRAINT PK_pins PRIMARY KEY (id, server));', (error, results, fields) => {
            if (error) {
                console.error(error);
            }
        });
        this._database.query('ALTER TABLE Servers ADD `pinChannel` VARCHAR(30);',
                            (error, results, fields) => { if (error) return; });
        this._database.query('ALTER TABLE Servers ADD `pinEmoji` VARCHAR(50);',
                            (error, results, fields) => { if (error) return; });
        this._database.query('ALTER TABLE Servers ADD `pinTimeout` VARCHAR(30);',
                            (error, results, fields) => { if (error) return; });
        this._database.query('ALTER TABLE Servers ADD `pinThreshold` VARCHAR(30);',
                            (error, results, fields) => { if (error) return; });
        
        this._database.query('SELECT id, pinChannel, pinEmoji, pinTimeout, pinThreshold FROM Servers', (error, results, fields) => {
            if (error) {
                console.error(error);
                return;
            }

            if (!results || results.length === 0) return;

            for (let result of results) {
                this._servers.set(result.id, new Server(result.id, result.pinChannel, result.pinEmoji, result.pinTimeout, result.pinThreshold));
            }
        });      
        
        this.setupHandlers();
    }

    /**
     * Event handlers for edit and deletion
     *
     * @method setupHandlers
     * @returns {void}
     */
    setupHandlers() {
        this._reactionHandler = this.reactionHandler.bind(this);
        this._collectionDoneHandler = this.collectionDoneHandler.bind(this);

        const serverAddHandler = this.serverAddHandler.bind(this);
        const messageHandler = this.messageHandler.bind(this);

        this._client.on(Events.MessageCreate, messageHandler);

        this._eventBus.on('new server', serverAddHandler);
    }

    /**
     * If a new server enters the database, we should
     * add them to the map.
     *
     * @method serverAddHandler
     * @param {String} id - the server's ID
     */
    serverAddHandler(id) {
        this._servers.set(id, new Server(id, null, null, null, null));
    }

    /**
     * Handles message creation, sets up
     * a collector for the reactions
     *
     * @method messageHandler
     * @param {Message} message
     * @returns {void}
     */
    messageHandler(message) {
        const server = this._servers.get(message.guildId);
        if (!server) return;
        //if (!server.canPin()) return;

        const filter = (reaction, user) => true;
        const collector = message.createReactionCollector({ filter, time: server.timeout * 60 * 1000 });
        this._collectors.set(message.id, { collector: collector, author: message.author.id, pinned: false, entry: null });

        collector.on('collect', (reaction) => console.log(reaction));
        collector.on('end', collected => {
            this._collectionDoneHandler(message.id, collected)
        });
    }

    /**
     * Triggered whenever a collector receives a pin.
     *
     * @method reactionHandler
     * @param {MessageReaction} reaction
     * @param {User} user
     * @returns {void}
     */
    reactionHandler(reaction, user) {
        console.log(reaction)
        const server = this._servers.get(reaction.message.guildId);
        const message = this._collectors.get(reaction.message.id);
        if (!server) return;

        if (reaction.count >= server.threshold) {
            if (!message.pinned) {
                reaction.message.guild.channels.fetch(server.channel)
                    .then(pinChannel => {
                        const embed = new EmbedBuilder()
                            .setAuthor({ name: 'Pinned Message', iconURL: reaction.message.author.displayAvatarURL() })
                            .setFooter({ text: reaction.count + ' ' + reaction.emoji.name })
                            .setTimestamp(reaction.message.createdTimestamp);
                        
                        if (reaction.message.content) embed.setDescription(reaction.message.content);
                        if (message.attachments.first())
                            embed.setImage(message.attachments.first().proxyURL);

                        pinChannel.send({ embeds: [embed] })
                            .then(res => {
                                message.entry = res;
                                message.pinned = true;
                            });
                    })
                    .catch(error => console.error);
            } else {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: 'Pinned Message', iconURL: reaction.message.author.displayAvatarURL() })
                    .setFooter({ text: reaction.count + ' ' + reaction.emoji.name })
                    .setTimestamp(reaction.message.createdTimestamp);
    
                    if (reaction.message.content) embed.setDescription(reaction.message.content);
                    if (message.attachments.first())
                        embed.setImage(message.attachments.first().proxyURL);
                
                message.entry.edit({ embeds: [embed] });
            }
        } else {
            if (!message.pinned) return;
            message.entry.delete();
            message.entry = null;
            message.pinned = false;
        }
    }

    /**
     * Triggered whenever a collector is done.
     *
     * @method collectionDoneHandler
     * @param {String} id
     * @param {Collection<MessageReaction>} collection
     * @returns {void}
     */
    collectionDoneHandler(id, collection) {
        const message = this._collectors.get(id);
        if (collection.size === 0) {
            this._collectors.delete(id);
            return;
        }

        this._database.query(`SELECT id, server FROM Pins WHERE id = '${message.author}' AND server = '${message.collector.channel.guildId}';`, (error, results, fields) => {
            if (error) {
                console.error(error);
                return;
            }

            if (!results || results.length === 0) {
                // the first message with pins for this user :)
                this._database.query(`INSERT INTO Pins VALUES ('${message.author}', '${message.collector.channel.guildId}', '${collection.size}');`, (error, results, fields) => {
                    if (error) console.error(error);
                    this._collectors.delete(id);
                });
            } else {
                this._database.query(`UPDATE Pins SET pins = pins + ${collection.size} WHERE id = '${message.author}' AND server = '${message.collector.channel.guildId}';`, (error, results, fields) => {
                    if (error) console.error(error);
                    this._collectors.delete(id);
                });
            }
        });
    }
}
