import { CommandInteraction, EmbedBuilder, Events } from "discord.js";
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
        this._database.query('CREATE TABLE IF NOT EXISTS Mutes (id VARCHAR(30) NOT NULL, server VARCHAR(30) NOT NULL, reason VARCHAR(1000), roles VARCHAR(10000), expires VARCHAR(30), CONSTRAINT PK_mute PRIMARY KEY (id, server));',
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
        const logHandler = this.logHandler.bind(this);

        this._eventBus.on('mute', muteHandler);
        this._eventBus.on('ban', banHandler);
        this._eventBus.on('kick', kickHandler);
        this._eventBus.on('unban', unbanHandler);
        this._eventBus.on('unmute', unmuteHandler);
        this._eventBus.on('mod action', logHandler);

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
        this._database.query('SELECT id, server, reason, expires FROM Bans;', async (error, results, fields) => {
            if (error) console.error(error);
            if (!results || results.length === 0) return;

            for (let result of results) {
                const guild = await this._client.guilds.fetch(result.server);
                try {
                    await guild.members.fetch(result.id);
                } catch (error) {
                    // the member left the guild
                    this._database.query(`DELETE FROM Bans WHERE id = '${result.id}' AND server = '${result.server}';`, (error, results, fields) => {
                        if (error) console.error(error);
                    });
                    continue;
                }

                let expires;

                if (result.expires) {
                    expires = new Date(result.expires);
        
                    if (expires < Date.now()) {
                        // the ban has expired
                        this._punishments.push({
                            type: 'ban',
                            punishment: new Ban(this._eventBus, result.id, result.server, result.reason)
                        });

                        this._eventBus.trigger('unban', result.id, result.server);
                        continue;
                    }
                }

                this._punishments.push({
                    type: 'ban',
                    punishment: new Ban(this._eventBus, result.id, result.server, result.reason, expires ?? null)
                });
            }
        });
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
        this._database.query('SELECT id, server, reason, roles, expires FROM Mutes;', async (error, results, fields) => {
            if (error) console.error(error);
            if (!results || results.length === 0) return;

            for (let result of results) {
                const guild = await this._client.guilds.fetch(result.server);
                try {
                    await guild.members.fetch(result.id);
                } catch (error) {
                    // the member left the guild
                    this._database.query(`DELETE FROM Mutes WHERE id = '${result.id}' AND server = '${result.server}';`, (error, results, fields) => {
                        if (error) console.error(error);
                    });
                    continue;
                }

                let expires, roles;

                if (result.roles) {
                    roles = result.roles.split(' ');
                }

                if (result.expires) {
                    expires = new Date(result.expires);
        
                    if (expires < Date.now()) {
                        // the mute has expired
                        this._punishments.push({
                            type: 'mute',
                            punishment: new Mute(this._eventBus, result.id, result.server, result.reason, null, roles ?? null)
                        });

                        this._eventBus.trigger('unmute', result.id, result.server);
                        continue;
                    }
                }

                this._punishments.push({
                    type: 'mute',
                    punishment: new Mute(this._eventBus, result.id, result.server, result.reason, expires ?? null, roles ?? null)
                });
            }
        });
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
                    return;
                }

                muteRole = results[0].muteRole;

                this._client.guilds.fetch(server)
                    .then(async guild => {
                        guild.members.fetch(id)
                            .then(async (member) => {
                                const oldRoles = Array.from(member.roles.cache.keys());
                                member.roles.remove(oldRoles.filter(id => {
                                    if (guild.roles.premiumSubscriberRole) {
                                        return id !== guild.roles.premiumSubscriberRole.id;
                                    }
                                    return true;
                                }))
                                    .then(async res => {
                                        res.roles.add(muteRole)
                                            .then(async res => {
                                                let roleString = '';
                                                for (let i = 0; i < oldRoles.length; i++) {
                                                    roleString += oldRoles[i];
                                                    if (i + 1 !== oldRoles.length) roleString += ' ';
                                                }
                                                this._database.query('INSERT INTO Mutes VALUES (?, ?, ?, ?, ?)', async (error, results, fields) => {
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

                                                    this._eventBus.trigger('mod action', server, 'mute', interaction.guild.name, id, interaction.user.id, reason, expires);
                                                
                                                    if (i === 0) 
                                                        await interaction.reply({ content: `Muted user <@${id}> ${expires ? 'until ' + expires.toUTCString() : 'indefinitely'} with reason: ${reason}`, ephemeral: true });
                                                }, [id, server, reason, roleString, expires]);
                                            })
                                            .catch(async error => {
                                                if (error.code === 10007) { // => 'Unknown Member'
                                                    // not in this server in the modnetwork, which is fine
                                                    this._eventBus.trigger('mod action', server, 'mute', interaction.guild.name, id, interaction.user.id, reason, expires);
                                                    return;
                                                }
                                                errored = true;
                                                if (error.code === 50013) { // => 'Missing Permissions'
                                                    await interaction.reply({ content: `I can't mute <@${id}>; their permissions are too high.`, ephemeral: true });
                                                    return;
                                                }
                                            });
                                    })
                                    .catch(async error => {
                                        if (error.code === 10007) { // => 'Unknown Member'
                                            // not in this server in the modnetwork, which is fine
                                            this._eventBus.trigger('mod action', server, 'mute', interaction.guild.name, id, interaction.user.id, reason, expires);
                                            return;
                                        }
                                        errored = true;
                                        if (error.code === 50013) { // => 'Missing Permissions'
                                            await interaction.reply({ content: `I can't mute <@${id}>; their permissions are too high.`, ephemeral: true });
                                            return;
                                        }
                                    });
                            })
                            .catch(async (error) => {
                                if (error.code === 10007) { // => 'Unknown Member'
                                    // not in this server in the modnetwork, which is fine
                                    this._eventBus.trigger('mod action', server, 'mute', interaction.guild.name, id, interaction.user.id, reason, expires);
                                    return;
                                }
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
                .then(async guild => {
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

                                this._eventBus.trigger('mod action', server, 'ban', interaction.guild.name, id, interaction.user.id, reason, expires);

                                if (i === 0) 
                                    await interaction.reply({ content: `Banned user <@${id}> ${expires ? 'until ' + expires.toUTCString() : 'indefinitely'} with reason: ${reason}`, ephemeral: true });
                            }, [id, server, reason, expires]);
                        })
                        .catch(async (error) => {
                            if (error.code === 10007) { // => 'Unknown Member'
                                // not in this server in the modnetwork, which is fine
                                this._eventBus.trigger('mod action', server, 'ban', interaction.guild.name, id, interaction.user.id, reason, expires);
                                return;
                            }
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
     * @param {String} origin - where the kick came from
     * @param {String} id - the user's ID
     * @param {String} moderator - who kicked the user
     * @param {String} server - the server
     * @param {String} reason - why the user was kicked
     */
    kickHandler(origin, id, moderator, server, reason) {
        this._client.guilds.fetch(server)
            .then(async guild => {
                guild.members.fetch(id)
                    .then(member => {
                        member.kick(reason).catch(error => console.error)
                        this._eventBus.trigger('mod action', server, 'kick', origin, id, moderator, reason);
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
                                    const muteRemoved = this._punishments.splice(this._punishments.indexOf(mute), 1);
                                    muteRemoved[0].punishment.destroy()
                                    this._eventBus.trigger('mod action', server, 'unmute', null, id, this._client.user.id);
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
                            this._database.query(`DELETE FROM Bans WHERE id = '${id}' AND server = '${server}';`, (error, results, fields) => {
                                if (error) console.error(error);

                                const ban = this._punishments.filter(p => p.type === 'ban' && p.punishment.id === id && p.punishment.server === server);
                                this._punishments = this._punishments.splice(this._punishments.indexOf(ban), 1);
                                ban.punishment.destroy();
                                this._eventBus.trigger('mod action', server, 'unban', null, id, this._client.user.id);
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

    /**
     * Logs all moderation actions to the modLog channel.
     *
     * @method logHandler
     * @param {String} server - this server's ID
     * @param {String} action - 'mute', 'ban', 'kick', 'unmute', 'unban'
     * @param {String} origin - the server originating this action
     * @param {String} target - who the action was done to
     * @param {String} moderator - who the action was done by
     * @param {String} reason - why the action was done
     * @param {Date} expires - when the mute/ban expires
     */
    logHandler(server, action, origin, target, moderator, reason = null, expires = null) {
        this._database.query(`SELECT modLog FROM Servers WHERE id = '${server}';`, async (error, results, fields) => {
            if (error) {
                console.error(error);
                return;
            }

            if (!results || results.length === 0 || !results[0].modLog) {
                // there's no modLog configured for this server
                return;
            }

            try {
                const guild = await this._client.guilds.fetch(server);
                const channel = await guild.channels.fetch(results[0].modLog);
                const user = await guild.members.fetch(target);
                if (!channel.isTextBased()) return;

                const embed = new EmbedBuilder()
                    .setAuthor({ name: `[${action.toUpperCase()}] ${user.user.tag}`, iconURL: user.displayAvatarURL() })
                    .addFields(
                        { name: 'User', value: '<@' + user.id + '>' },
                        { name: 'Moderator', value: '<@' + moderator + '>' }
                    );

                switch (action) {
                    case 'mute':
                        embed.addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Originating Server', value: origin }
                        )
                        .setColor('#ff0000');

                        if (expires) embed.addFields({ name: '\u200B', value: expires ? '**Expires:** ' + expires : '\u200B' });

                        break;
                    case 'ban':
                        embed.addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Originating Server', value: origin }
                        )
                        .setColor('#ff0000');

                        if (expires) embed.addFields({ name: '\u200B', value: expires ? '**Expires:** ' + expires : '\u200B' });

                        break;
                    case 'kick':
                        embed.addFields(
                            { name: 'Reason', value: reason },
                            { name: 'Originating Server', value: origin }
                        )
                        .setColor('#ff0000');
                        break;
                    case 'unmute':
                    case 'unban':
                        embed.setColor('#00ff00');
                        break;
                    default:
                        return;
                }

                channel.send({ embeds: [embed] });
            } catch (error) {
                console.error(error);
            }
        });
    }
}
