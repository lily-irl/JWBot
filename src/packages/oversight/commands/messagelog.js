import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('messagelog')
    .setDescription('Sets this server\'s message log channel')
    .addSubcommand(subcommand => {
        return subcommand.setName('set')
            .setDescription('Sets what channel should be the message log')
            .addChannelOption(option => {
                return option.setName('channel')
                    .setDescription('The channel to set')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand.setName('clear')
            .setDescription('Removes the message log channel, disabling logging');
    })
    .addSubcommand(subcommand => {
        return subcommand.setName('query')
            .setDescription('Returns this server\'s current message log');
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

/**
 * 
 * @param {Interaction} interaction 
 * @param {EventBus} eventBus 
 * @param {Database} database 
 */
export const execute = async (interaction, eventBus, database) => {
    if (interaction.options.getSubcommand() === 'set') {
        const guild = interaction.guildId;
        const channel = interaction.options.getChannel('channel');

        database.query(`UPDATE Servers SET messageLog = ? WHERE id = '${guild}';`, async (error, results, fields) => {
            if (error) {
                console.error(error);
                await interaction.reply({ content: 'A database error occurred while attempting to update the messageLog', ephemeral: true });
                return;
            }

            await interaction.reply({ content: `Set this server's message log channel to <#${channel.id}>` });
        }, channel.id);
    } else if (interaction.options.getSubcommand() === 'clear') {
        const guild = interaction.guildId;

        database.query(`UPDATE Servers SET messageLog = NULL WHERE id = '${guild}';`, async (error, results, fields) => {
            if (error) {
                await interaction.reply({ content: 'A database error occurred while attempting to update the messageLog', ephemeral: true });
            }

            await interaction.reply({ content: 'Cleared this server\'s message log channel.' });
        });
    } else if (interaction.options.getSubcommand() === 'query') {
        const guild = interaction.guildId;

        database.query(`SELECT messageLog FROM Servers WHERE id = '${guild}';`, async (error, results, fields) => {
            if (error) {
                await interaction.reply({ content: 'A database error occurred while attempting to query the messageLog', ephemeral: true });
            }

            if (results.length === 0 || !results[0].messageLog) {
                await interaction.reply({ content: 'This server doesn\'t have a message log channel' });
            } else {
                await interaction.reply({ content: `This server's log channel is <#${results[0].messageLog}>` });
            }
        });
    }
}
