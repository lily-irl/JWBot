import { ChannelType, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('pinboard')
    .setDescription('Configures this server\'s pinboard.')
    .addSubcommand(subcommand => {
        return subcommand
            .setName('info')
            .setDescription('Gets information about the pinboard.');
    })
    .addSubcommandGroup(group => {
        return group
            .setName('set')
            .setDescription('Changes a setting on the pinboard')
            .addSubcommand(subcommand => {
                return subcommand
                    .setName('channel')
                    .setDescription('Sets the channel to log pins to')
                    .addChannelOption(option => {
                        return option
                            .setName('channel')
                            .setDescription('The channel to post pins to')
                            .setRequired(true)
                            .addChannelTypes(ChannelType.GuildText);
                    });
            })
            .addSubcommand(subcommand => {
                return subcommand
                    .setName('timeout')
                    .setDescription('How long to keep watching for pins on a message')
                    .addIntegerOption(option => {
                        return option
                            .setName('minutes')
                            .setDescription('Time to watch, in minutes')
                            .setRequired(true);
                    });
            })
            .addSubcommand(subcommand => {
                return subcommand
                    .setName('threshold')
                    .setDescription('How many pins required to pin a message')
                    .addIntegerOption(option => {
                        return option
                            .setName('pins')
                            .setDescription('The number of pins required')
                            .setRequired(true);
                    });
            })
            .addSubcommand(subcommand => {
                return subcommand
                    .setName('emoji')
                    .setDescription('Sets this server\'s pin emote')
                    .addStringOption(option => {
                        return option
                            .setName('emoji')
                            .setDescription('The emoji to set')
                            .setRequired(true);
                    });
            });
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const execute = async (interaction, eventBus, database) => {
    switch (interaction.options.getSubcommand()) {
        case 'info':
            database.query(`SELECT pinChannel, pinEmoji, pinTimeout, pinThreshold FROM Servers WHERE id = '${interaction.guildId}';`, async (error, results, fields) => {
                if (error) {
                    console.error(error);
                    await interaction.reply({ content: 'A database error occured fetching the pinboard information', ephemeral: true });
                    return;
                }

                const embed = new EmbedBuilder().setTitle('Pinboard information for ' + interaction.guild.name);

                if (!results || results.length === 0) {
                    embed.addFields(
                        { name: 'Enabled', value: 'No' },
                        { name: 'Channel', value: 'None' },
                        { name: 'Emoji', value: 'None' },
                        { name: 'Timeout', value: 'None' },
                        { name: 'Threshold', value: 'None' }
                    );

                    await interaction.reply({ embeds: [embed] });
                    return;
                }

                const result = results[0];
                console.log(result)

                if (!(result.pinChannel && result.pinEmoji && result.pinTimeout && result.pinThreshold)) {
                    embed.addFields({ name: 'Enabled', value: 'No' });
                } else {
                    embed.addFields({ name: 'Enabled', value: 'Yes' });
                }

                embed.addFields(
                    { name: 'Channel', value: result.pinChannel ? '<#' + result.pinChannel + '>' : 'None' },
                    { name: 'Emoji', value: result.pinEmoji ?? 'None' },
                    { name: 'Timeout', value: result.pinTimeout ? result.pinTimeout + ' min' : 'None' },
                    { name: 'Threshold', value: String(result.pinThreshold) ?? 'None' }
                );

                await interaction.reply({ embeds: [embed] });
            });
            break;
        case 'channel':
            const channel = interaction.options.getChannel('channel');
            database.query(`UPDATE Servers SET pinChannel = ? WHERE id = '${interaction.guildId}';`, async (error, results, fields) => {
                if (error) {
                    console.error(error);
                    await interaction.reply({ content: 'A database error occurred while attempting to update the pinChannel', ephemeral: true });
                    return;
                }

                eventBus.trigger('pin update', interaction.guildId, 'channel', channel.id);
                await interaction.reply({ content: `Set this server's pinboard channel to <#${channel.id}>` });
            }, channel.id);
            break;
        case 'timeout':
            const timeout = interaction.options.getInteger('minutes');
            database.query(`UPDATE Servers SET pinTimeout = ? WHERE id = '${interaction.guildId}';`, async (error, results, fields) => {
                if (error) {
                    console.error(error);
                    await interaction.reply({ content: 'A database error occurred while attempting to update the pinTimeout', ephemeral: true });
                    return;
                }
    
                eventBus.trigger('pin update', interaction.guildId, 'timeout', timeout);
                await interaction.reply({ content: `Set this server's pin timeout to ${timeout} min` });
            }, timeout);
            break;
        case 'threshold':
            const threshold = interaction.options.getInteger('pins');
            database.query(`UPDATE Servers SET pinThreshold = ? WHERE id = '${interaction.guildId}';`, async (error, results, fields) => {
                if (error) {
                    console.error(error);
                    await interaction.reply({ content: 'A database error occurred while attempting to update the pinThreshold', ephemeral: true });
                    return;
                }

                eventBus.trigger('pin update', interaction.guildId, 'threshold', threshold);
                await interaction.reply({ content: `Set this server's pin threshold to ${threshold}` });
            }, threshold);
            break;
        case 'emoji':
            const emoji = interaction.options.getString('emoji');
            database.query(`UPDATE Servers SET pinEmoji = ? WHERE id = '${interaction.guildId}';`, async (error, results, fields) => {
                if (error) {
                    console.error(error);
                    await interaction.reply({ content: 'A database error occurred while attempting to update the pinEmoji', ephemeral: true });
                    return;
                }
    
                eventBus.trigger('pin update', interaction.guildId, 'emoji', emoji);
                await interaction.reply({ content: `Set this server's pin emoji to ${emoji}` });
            }, emoji);
            break;
        default:
            await interaction.reply({ content: 'Unrecognised subcommand ' + interaction.options.getSubcommand(), ephemeral: true });
    }
};
