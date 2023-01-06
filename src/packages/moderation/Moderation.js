import { CommandInteraction, Events } from "discord.js";
import Ban from "./Ban.js";
import Mute from "./Mute.js";

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
        this._database.query('ALTER TABLE Servers ADD `muteRole` VARCHAR(30);',
                            (error, results, fields) => { if (error) return; })
        this._database.query('ALTER TABLE Servers ADD `modLog` VARCHAR(30);',
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
     * Handles a mute. Expects the mute information.
     *
     * @method muteHandler
     * @param {CommandInteraction} interaction
     * @param {GuildMember} target - the person banned
     * @param {String} reason - the reason this person is banned
     * @param {Date|null} expires - when this ban expires
     */
    muteHandler(interaction, target, reason, expires) {
        // ensure this user isn't already banned
        this._database.query(`SELECT id FROM Mutes WHERE id = '${target.id}' AND server = '${interaction.guildId}'`, async (error, results, fields) => {
            if (error) {
                console.error(error)
                await interaction.reply({ content: 'A database error occurred while attempting to mute this user', ephemeral: true });
                return;
            }

            if (results.length !== 0) {
                await interaction.reply({ content: 'This user is already muted. You must unmute the user before they can be remuted.', ephemeral: true });
                return;
            }

            const guildsToMute = [];

            // check if this guild is in a moderation network
            this._database.query(`SELECT network FROM Servers WHERE id = '${interaction.guildId}';`, async (error, results, fields) => {
                if (error) {
                    console.error(error);
                    await interaction.reply({ content: 'A database error occurred while attempting to mute this user', ephemeral: true });
                    return;
                }

                if (!results[0].network) {
                    // it's not in a moderation network
                    guildsToMute.push(interaction.guildId);
                    try {
                        this._executeMutes(guildsToMute, target.id, reason, expires, interaction);
                    } catch (error) {
                        console.error(error);
                    }
                    return;
                }

                // it is in a moderation network
                this._database.query('SELECT id FROM Servers WHERE network = ?', async (error, results, fields) => {
                    if (error) {
                        console.error(error)
                        await interaction.reply({ content: 'A database error occurred while attempting to ban this user', ephemeral: true });
                        return;
                    }

                    for (let r of results) guildsToMute.push(r.id);

                    try {
                        this._executeMutes(guildsToMute, target.id, reason, expires, interaction);
                    } catch (error) {
                        console.error(error);
                    }
                }, results[0].network);
            });
        });
    }

    /**
     * Executes mutes across the given servers.
     *
     * @method _executeMutes
     * @param {String[]} servers - the ids of the servers
     * @param {String} id - the user being muted
     * @param {String} reason - the reason the user is muted
     * @param {Date|null} expires - when the mute expires
     * @param {CommandInteraction} interaction
     * @returns {void}
     * @async
     */
    async _executeMutes(servers, id, reason, expires, interaction) {
        let errored = false;
        for (let i = 0; i < servers.length; i++) {
            if (errored) return;
            const server = servers[i];
            let muteRole;
            this._database.query(`SELECT muteRole FROM Servers WHERE id = '${server}';`, async (error, results, fields) => {
                if (error) {
                    errored = true;
                    console.error(error);
                    await interaction.reply({ content: 'A database error occurred while attempting to mute this user', ephemeral: true });
                    return;
                }

                if (!results || results.length === 0 || !results[0].muteRole) {
                    console.log('server ' + server + ' has no mute role set up');
                    if (i + 1 == servers.length) {
                        await interaction.reply({ content: 'One or more servers in this moderation network has no mute role.', ephemeral: true });
                    }
                    return;
                }

                muteRole = results[0].muteRole;

                this._client.guilds.fetch(server)
                    .then(guild => {
                        guild.members.fetch(id)
                            .then(async (member) => {
                                const oldRoles = Array.from(member.roles.cache.keys());
                                member.roles.remove(oldRoles)
                                    .then(async res => {
                                        res.roles.add(muteRole)
                                            .then(async res => {
                                                this._database.query('INSERT INTO Mutes VALUES (?, ?, ?, ?)', async (error, results, fields) => {
                                                    if (error) {
                                                        errored = true;
                                                        console.error(error);
                                                        await interaction.reply({ content: 'A database error occurred while attempting to mute this user', ephemeral: true });
                                                        return;
                                                    }
                                                
                                                    this._punishments.push({
                                                        type: 'mute',
                                                        punishment: new Mute(this._eventBus, id, server, reason, expires, oldRoles)
                                                    });
                                                
                                                    if (i + 1 === servers.length) 
                                                        await interaction.reply({ content: `Muted user <@${id}> ${expires ? 'until ' + expires.toUTCString() : 'indefinitely'} with reason: ${reason}`, ephemeral: true });
                                                }, [id, server, reason, expires]);
                                            })
                                            .catch(async error => {
                                                errored = true;
                                                if (error.code === 50013) { // => 'Missing Permissions'
                                                    await interaction.reply({ content: `I can't mute <@${id}>; their permissions are too high.`, ephemeral: true });
                                                    return;
                                                }
                                            });
                                    })
                                    .catch(async error => {
                                        errored = true;
                                        if (error.code === 50013) { // => 'Missing Permissions'
                                            await interaction.reply({ content: `I can't mute <@${id}>; their permissions are too high.`, ephemeral: true });
                                            return;
                                        }
                                    });
                            })
                            .catch(async (error) => {
                                errored = true;
                                console.error(error);
                                await interaction.reply({ content: 'There was an error while attempting to mute the user', ephemeral: true });
                            });
                    })
                    .catch(async (error) => {
                        errored = true;
                        console.error(error);
                        await interaction.reply({ content: 'There was an error while attempting to mute the user', ephemeral: true })
                    });
            });
        }
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
                    try {
                        this._executeBans(guildsToBan, target.id, reason, expires, interaction);
                    } catch (error) {
                        console.error(error);
                    }
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

                    try {
                        this._executeBans(guildsToBan, target.id, reason, expires, interaction);
                    } catch (error) {
                        console.error(error);
                    }
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
                });
        }
    }

    /**
     * Handles a kick.
     *
     * @method kickHandler
     * @param {String} id - the user's ID
     * @param {String} server - the server
     * @param {String} reason - why the user was kicked
     */
    kickHandler(id, server, reason) {
        this._client.guilds.fetch(server)
            .then(guild => {
                guild.members.fetch(id)
                    .then(member => {
                        member.kick(reason).catch(error => console.error)
                    })
                    .catch(error => console.error);
            })
            .catch(error => console.error);
    }

    /**
     * Removes a mute.
     *
     * @method unmuteHandler
     * @param {String} id - the user ID to unmute
     * @param {String} server - the server to unmute them from
     */
    unmuteHandler(id, server) {
        const mute = this._punishments.find(p => p.type === 'mute' && p.punishment.id === id && p.punishment.server === server);
        if (!mute) return;

        this._database.query(`SELECT server FROM Mutes WHERE id = '${id}' AND server = '${server}';`, (error, results, fields) => {
            if (error) {
                console.error(error);
                return;
            }

            if (results.length === 0) return;

            this._client.guilds.fetch(server)
                .then(guild => {
                    guild.members.fetch(id)
                        .then(member => {
                            member.roles.set(mute.punishment.roles)
                                .then(res => {
                                    this._database.query(`DELETE FROM Mutes WHERE id = '${id}' AND server = '${server}';`, (error, results, fields) => {
                                        if (error) console.log(error);
                                    })
                                    this._punishments.splice(this._punishments.indexOf(mute), 1);
                                })
                                .catch(error => {
                                    console.error(error);
                                })
                        })
                        .catch(error => {
                            console.error(error);
                        })
                })
                .catch(error => {
                    console.error(error);
                })
        });
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
