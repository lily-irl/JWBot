import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('network')
    .setDescription('Sets this server\'s moderation network')
    .addSubcommand(subcommand => {
        return subcommand.setName('set')
            .setDescription('Sets what moderation network this server should join')
            .addStringOption(option => {
                return option.setName('name')
                    .setDescription('A name for a new or existing moderation network')
                    .setRequired(true);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand.setName('clear')
            .setDescription('Removes this server from any existing network');
    })
    .addSubcommand(subcommand => {
        return subcommand.setName('query')
            .setDescription('Returns this server\'s current moderation network');
    });

/**
 * 
 * @param {Interaction} interaction 
 * @param {EventBus} eventBus 
 * @param {Database} database 
 */
export const execute = async (interaction, eventBus, database) => {
    if (interaction.options.getSubcommand() === 'set') {
        const guild = interaction.guildId;
        const name = interaction.options.getString('name');

        database.query(`UPDATE Servers SET network = ? WHERE id = '${guild}';`, async (error, results, fields) => {
            if (error) {
                await interaction.reply({ content: 'A database error occurred while attempting to update the ModerationNetwork', ephemeral: true });
            }

            await interaction.reply({ content: `Set this server's moderation network to ${name}` });
        }, name);
    } else if (interaction.options.getSubcommand() === 'clear') {
        const guild = interaction.guildId;

        database.query(`UPDATE Servers SET network = NULL WHERE id = '${guild}';`, async (error, results, fields) => {
            if (error) {
                await interaction.reply({ content: 'A database error occurred while attempting to update the ModerationNetwork', ephemeral: true });
            }

            await interaction.reply({ content: 'Cleared this server\'s moderation network.' });
        });
    } else if (interaction.options.getSubcommand() === 'query') {
        const guild = interaction.guildId;

        database.query(`SELECT network FROM Servers WHERE id = '${guild}';`, async (error, results, fields) => {
            if (error) {
                await interaction.reply({ content: 'A database error occurred while attempting to query the ModerationNetwork', ephemeral: true });
            }

            if (results.length === 0 || !results[0].network) {
                await interaction.reply({ content: 'This server isn\'t a part of any moderation network' });
            } else {
                await interaction.reply({ content: `This server is in the ${results[0].network} network` });
            }
        });
    }
}
