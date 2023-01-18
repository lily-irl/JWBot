import { Events, EmbedBuilder } from "discord.js";

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

        this.enable();
    }

    /**
     * Sets up the database basically
     *
     * @method enable
     * @returns {void}
     */
    enable() {
        this._database.query('ALTER TABLE Servers ADD `messageLog` VARCHAR(30);',
                            (error, results, fields) => { if (error) return; })
        
        this.setupHandlers();
    }

    /**
     * Event handlers for edit and deletion
     *
     * @method setupHandlers
     * @returns {void}
     */
    setupHandlers() {
        const editHandler = this.editHandler.bind(this);
        const deletionHandler = this.deletionHandler.bind(this);

        this._client.on(Events.MessageUpdate, editHandler);
        this._client.on(Events.MessageDelete, deletionHandler);
    }

    /**
     * Handles message deletion
     *
     * @method deletionHandler
     * @param {Message} message
     * @returns {void}
     */
    deletionHandler(message) {
        if (message.author.id === this._client.user.id) return;

        this._database.query(`SELECT messageLog FROM Servers WHERE id = '${message.guildId}';`, async (error, results, fields) => {
            if (error) {
                console.error(error);
                return;
            }

            if (!results || results.length === 0 || !results[0].messageLog) return;

            let channel;

            try {
                channel = await message.guild.channels.fetch(results[0].messageLog);
            } catch (error) {
                console.error(error);
                return;
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: `[DELETE] ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
                .setColor('#ff0000')
                .addFields({ name: 'Channel', value: '<#' + message.channel.id + '>' });

            if (message.content) {
                embed.addFields({ name: 'Content', value: message.content });
            }
            
            if (message.attachments.first())
                embed.setImage(message.attachments.first().proxyURL)
            
            channel.send({ embeds: [embed] });
        });
    }

    /**
     * Handles a message edit
     *
     * @method editHandler
     * @param {Message} oldMessage
     * @param {Message} newMessage
     * @returns {void}
     */
    editHandler(oldMessage, newMessage) {
        if (oldMessage.author.id === this._client.user.id) return;

        // check if this was just embeds populating
        if (oldMessage.content && newMessage.content && oldMessage.content === newMessage.content && !oldMessage.embeds && newMessage.embeds) return;

        this._database.query(`SELECT messageLog FROM Servers WHERE id = '${newMessage.guildId}';`, async (error, results, fields) => {
            if (error) {
                console.error(error);
                return;
            }

            if (!results || results.length === 0 || !results[0].messageLog) return;

            let channel;

            try {
                channel = await newMessage.guild.channels.fetch(results[0].messageLog);
            } catch (error) {
                console.error(error);
                return;
            }

            const embed = new EmbedBuilder()
                .setAuthor({ name: `[EDIT] ${newMessage.author.tag}`, iconURL: newMessage.author.displayAvatarURL() })
                .setColor('#0000ff')
                .addFields({ name: 'Channel', value: '<#' + newMessage.channel.id + '>' });

            if (oldMessage.content) {
                embed.addFields({ name: 'Before', value: oldMessage.content });
            }

            if (newMessage.content) {
                embed.addFields({ name: 'After', value: newMessage.content });
            }
            
            if (oldMessage.attachments.first())
                embed.setImage(oldMessage.attachments.first().proxyURL)
            
            channel.send({ embeds: [embed] });
        });
    }
}
