import { CommandInteraction, Events } from "discord.js";
import Ban from "./Ban.js";

/**
 * The Moderation module provides kick, mute, and ban
 * functionality across a moderation network. 
 */
export default class Moderation {
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
         * An array of active mutes and bans
         *
         * @property _punishments
         * @type {any[]}
         * @private
         */
        this._punishments = [];

        this.enable();
    }

    /**
     * Ensures the database is ready and contains the tables relevant
     * to this module: Bans, Mutes, and ModerationNetworks.
     *
     * @method enable
     * @returns {void}
     */
    enable() {
        /*if (!this._database.ready) {
            console.log('The database isn\'t ready');
            return;
        }*/

        this._database.query('CREATE TABLE IF NOT EXISTS Bans (id VARCHAR(30) NOT NULL, server VARCHAR(30) NOT NULL, reason VARCHAR(1000), expires VARCHAR(30), CONSTRAINT PK_ban PRIMARY KEY (id, server));',
                            (error, results, fields) => { if (error) console.error(error); });
        this._database.query('CREATE TABLE IF NOT EXISTS Mutes (id VARCHAR(30) NOT NULL, server VARCHAR(30) NOT NULL, reason VARCHAR(1000), expires VARCHAR(30), CONSTRAINT PK_mute PRIMARY KEY (id, server));',
                            (error, results, fields) => { if (error) console.error(error); });
        // don't need to worry about IF NOT EXISTS for this one because if it does
        // it'll just fail and we can carry on
        this._database.query('ALTER TABLE Servers ADD `muteLog` VARCHAR(16);',
                            (error, results, fields) => { if (error) return; })
        this._database.query('ALTER TABLE Servers ADD `modLog` VARCHAR(16);',
                            (error, results, fields) => { if (error) return; })

        this.registerEvents();
        this.loadExistingBans();
        this.loadExistingMutes();
    }

    /**
     * Setup event handlers for mutes, bans, and kicks so that
     * they can be executed across the entire network
     *
     * @method registerEvents
     * @returns {void}
     */
    registerEvents() {
        const muteHandler = this.muteHandler.bind(this);
        const banHandler = this.banHandler.bind(this);
        const kickHandler = this.kickHandler.bind(this);
        const unmuteHandler = this.unmuteHandler.bind(this);
        const unbanHandler = this.unbanHandler.bind(this);
        const manualUnbanHandler = this.manualUnbanHandler.bind(this);

        this._eventBus.on('mute', muteHandler);
        this._eventBus.on('ban', banHandler);
        this._eventBus.on('kick', kickHandler);
        this._eventBus.on('unban', unbanHandler);
        this._eventBus.on('unmute', unmuteHandler);

        this._client.on(Events.GuildBanRemove, manualUnbanHandler);
    }

    /**
     * Load any existing bans from the database.
     * If they've expired since the Moderation object existed,
     * we'll unban the user in question.
     *
     * @method loadExistingBans
     * @returns {void}
     */
    loadExistingBans() {
        
    }

    /**
     * Load any existing bans from the database.
     * If they've expired since the Moderation object existed,
     * we'll unmute the user in question.
     *
     * @method loadExistingMutes
     * @returns {void}
     */
    loadExistingMutes() {

    }

    /**
     * Handles a mute. Expects a Mute object.
     *
     * @method muteHandler
     * @param {Mute} mute
     */
    muteHandler(mute) {

    }

    /**
     * Handles a ban. Expects the ban information.
     *
     * @method banHandler
     * @param {CommandInteraction} interaction
     * @param {GuildMember} target - the person banned
     * @param {String} reason - the reason this person is banned
     * @param {Date|null} expires - when this ban expires
     */
    async banHandler(interaction, target, reason, expires) {
        // ensure this user isn't already banned
        this._database.query(`SELECT id FROM Bans WHERE id = '${target.id}' AND server = '${interaction.guildId}'`, async (error, results, fields) => {
            if (error) {
                console.error(error)
                await interaction.reply({ content: 'A database error occurred while attempting to ban this user', ephemeral: true });
                return;
            }

            if (results.length !== 0) {
                await interaction.reply({ content: 'This user is already banned. You must unban the user before they can be rebanned.', ephemeral: true });
                return;
            }

            const guildsToBan = [];

            // check if this guild is in a moderation network
            this._database.query(`SELECT network FROM Servers WHERE id = '${interaction.guildId}';`, async (error, results, fields) => {
                if (error) {
                    console.error(error)
                    await interaction.reply({ content: 'A database error occurred while attempting to ban this user', ephemeral: true });
                    return;
                }

                if (!results[0].network) {
                    // it's not in a moderation network
                    guildsToBan.push(interaction.guildId);
                    this._executeBans(guildsToBan, target.id, reason, expires, interaction);
                    return;
                }

                // it is in a moderation network
                this._database.query('SELECT id FROM Servers WHERE network = ?', async (error, results, fields) => {
                    if (error) {
                        console.error(error)
                        await interaction.reply({ content: 'A database error occurred while attempting to ban this user', ephemeral: true });
                        return;
                    }

                    for (let r of results) guildsToBan.push(r.id);

                    this._executeBans(guildsToBan, target.id, reason, expires, interaction);
                }, results[0].network);
            });
        });
    }

    /**
     * Executes bans across the given servers.
     *
     * @method _executeBans
     * @param {string[]} servers
     * @param {string} id
     * @param {string} reason
     * @param {Date} expires
     * @param {CommandInteraction} interaction
     * @returns {void}
     */
    async _executeBans(servers, id, reason, expires, interaction) {
        let errored = false;
        for (let i = 0; i < servers.length; i++) {
            if (errored) return;
            const server = servers[i];
            this._client.guilds.fetch(server)
                .then(guild => {
                    guild.bans.create(id, { reason: expires ? reason + ' | Expires ' + expires : reason })
                        .then(async (res) => {
                            this._database.query('INSERT INTO Bans VALUES (?, ?, ?, ?)', async (error, results, fields) => {
                                if (error) {
                                    errored = true;
                                    console.error(error);
                                    await interaction.reply({ content: 'A database error occurred while attempting to ban this user', ephemeral: true });
                                    return;
                                }

                                this._punishments.push({
                                    type: 'ban',
                                    punishment: new Ban(this._eventBus, id, server, reason, expires)
                                });

                                if (i + 1 === servers.length) 
                                    await interaction.reply({ content: `Banned user <@${id}> ${expires ? 'until ' + expires.toUTCString() : 'indefinitely'} with reason: ${reason}`, ephemeral: true });
                            }, [id, server, reason, expires]);
                        })
                        .catch(async (error) => {
                            errored = true;
                            if (error.code === 50013) { // => 'Missing Permissions'
                                await interaction.reply({ content: `I can't ban <@${id}>; their permissions are too high.`, ephemeral: true });
                                return;
                            }
                            console.error(error);
                            await interaction.reply({ content: 'There was an error while attempting to ban the user', ephemeral: true });
                        });
                })
                .catch(async (error) => {
                    errored = true;
                    console.error(error);
                    await interaction.reply({ content: 'There was an error while attempting to ban the user', ephemeral: true })
                })
        }
    }

    /**
     * Handles a kick. Expects a Kick object.
     *
     * @method kickHandler
     * @param {Kick} kick
     */
    kickHandler(kick) {

    }

    /**
     * Removes a mute, expects a Mute object.
     *
     * @method unmuteHandler
     * @param {Mute} mute
     */
    unmuteHandler(mute) {

    }

    /**
     * Removes a ban.
     *
     * @method unbanHandler
     * @param {String} id - the user ID to unban
     * @param {String} server - the server to unban them from
     */
    unbanHandler(id, server) {
        this._database.query(`SELECT server FROM Bans WHERE id = '${id}' AND server = '${server}';`, (error, results, fields) => {
            if (error) {
                console.error(error);
                return;
            }

            if (results.length === 0) return;

            this._client.guilds.fetch(server)
                .then(guild => {
                    guild.bans.remove(id)
                        .then(user => {
                            console.log(user.username + ' unbanned from ' + guild.name);
                            this._database.query(`DELETE FROM Bans WHERE id = '${id}' AND server = '${server}';`, (error, results, fields) => {
                                if (error) console.error(error);

                                this._punishments = this._punishments.filter(p => !(p.type === 'ban' && p.punishment.id === id && p.punishment.server === server));
                            });
                        })
                        .catch(error => console.error);
                })
                .catch(error => console.error);
        });
    }

    /**
     * Handles a user being unbanned manually, not by JWBot.
     *
     * @method manualUnbanHandler
     * @param {GuildBan} ban - the ban that was removed
     */
    manualUnbanHandler(ban) {
        const matching = this._punishments.filter(p => p.type === 'ban' && p.punishment.id === ban.user.id && p.punishment.server === ban.guild.id);
        if (matching.length > 0) {
            this._database.query(`DELETE FROM Bans WHERE id = '${ban.user.id}' AND server = '${ban.guild.id}';`, (error, results, fields) => {
                if (error) console.error(error);
                this._punishments = this._punishments.filter(p => !(p.type === 'ban' && p.punishment.id === ban.user.id && p.punishment.server === ban.guild.id));
            });
        }
    }
}
