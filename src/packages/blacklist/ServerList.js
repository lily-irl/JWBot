import { EmbedBuilder } from "discord.js";

/**
 * A server-specific blacklist of words.
 */
export default class ServerList {
    /**
     *
     * @param {Client} client - the discord client
     * @param {Database} database - the database connection
     * @param {String} id - the server id
     * @constructor
     */
    constructor(client, database, id) {
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
        this._database = database

        /**
         * This server's ID
         *
         * @property _id
         * @type {String}
         * @private
         */
        this._id = id;

        /**
         * The Guild object
         *
         * @property guild
         * @type {Guild}
         */
        this.guild = null;

        /**
         * The blacklist of words
         *
         * @property blacklist
         * @type {RegExp[]}
         */
        this.blacklist = [];

        /**
         * The channel to log blacklisted expressions to
         *
         * @property _channel
         * @type {TextChannel}
         */
        this._channel = null;

        /**
         * The handler for any message event
         *
         * @property messageEventHandler
         * @type {function}
         */
        this.messageEventHandler = this.handleMessage.bind(this);

        this.enable();
    }

    /**
     * Set up the blacklist
     *
     * @method enable
     * @returns {void}
     */
    enable() {
        this._client.guilds.fetch(this._id)
            .then(guild => {
                this.guild = guild;
                this._database.query(`SELECT regex FROM Blacklist WHERE id = '${this._id}';`, (error, results, fields) => {
                    if (error) {
                        console.error(error);
                        return;
                    }

                    if (!(!results || results.length === 0)) {
                        for (let result of results) {
                            if (!this.has(result.regex)) this.blacklist.push(new RegExp(result.regex, 'i'));
                        }
                    }

                    this._database.query(`SELECT blacklistLog FROM Servers WHERE id = '${this._id}';`, async (error, results, fields) => {
                        if (error) {
                            console.error(error);
                            return;
                        }

                        if (!results || results.length === 0 || !results[0].blacklistLog) return;

                        let channel = null;

                        try {
                            channel = await this._client.channels.fetch(results[0].blacklistLog);
                        } catch (error) {
                            console.error(error);
                        }

                        this._channel = channel;
                    });
                });
            })
            .catch(error => console.error);
    }

    /**
     * Tests a string against the regexp
     *
     * @method test
     * @param {String} string
     * @returns {Boolean}
     */
    test(string) {
        string = string.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
        return this.blacklist.some(regex => regex.test(string));
    }

    /**
     * Tests if the blacklist already contains some regex
     *
     * @method has
     * @param {String} regex
     * @returns {Boolean}
     */
    has(regex) {
        const test = new RegExp(regex, 'i');

        for (let pattern of this.blacklist) {
            if (pattern.toString() === test.toString()) return true;
        }

        return false;
    }

    /**
     * Adds a regular expression into the blacklist
     *
     * @method add
     * @param {String} regex
     * @returns {void}
     */
    add(regex) {
        if (!this.has(regex)) {
            this._database.query(`INSERT INTO Blacklist VALUES ('${this._id}', ?);`, (error, results, fields) => {
                if (error) {
                    console.error(error);
                    return;
                }

                this.blacklist.push(new RegExp(regex, 'i'));
            }, regex);
        }
    }

    /**
     * Removes a regular expression from the blacklist
     *
     * @method remove
     * @param {String} regex
     * @returns {void}
     */
    remove(regex) {
        if (this.has(regex)) {
            this._database.query(`DELETE FROM Blacklist WHERE id = '${this._id}' AND regex = ?;`, (error, results, fields) => {
                if (error) {
                    console.error(error);
                    return;
                }

                for (let i = 0; i < this.blacklist.length; i++) {
                    if (this.blacklist[i].toString() === new RegExp(regex).toString()) {
                        this.blacklist.splice(i, 1);
                        return;
                    }
                }
            }, regex);
        }
    }

    /**
     * Handles a message and tests it against the blacklist.
     *
     * @param {Message} message 
     * @returns {void}
     */
    handleMessage(message) {
        const contents = message.content;
        const user = message.author;
        const channel = message.channelId;

        if (!this._channel) return;

        if (this.test(contents)) {
            const embed = new EmbedBuilder()
                .setAuthor({ name: `[BLACKLIST] ${user.username}`, iconURL: user.displayAvatarURL() })
                .setColor('#ff0000')
                .addFields(
                    { name: 'Author', value: '<@' + user.id + '>' },
                    { name: 'Channel', value: '<#' + channel + '>' },
                    { name: 'Message', value: contents }
                );
            
            this._channel.send({ embeds: [embed] });

            message.delete();
        }
    }
}