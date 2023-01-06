import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('muterole')
    .setDescription('Sets this server\'s \'muted\' role, required for mutes to work')
    .addSubcommand(subcommand => {
        return subcommand.setName('set')
            .setDescription('Sets what role should be the muted role')
            .addRoleOption(option => {
                return option.setName('role')
                    .setDescription('The role to apply to users when muted')
                    .setRequired(true);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand.setName('clear')
            .setDescription('Removes the muted role, disabling mute functionality');
    })
    .addSubcommand(subcommand => {
        return subcommand.setName('query')
            .setDescription('Returns this server\'s current muted role');
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
        const role = interaction.options.getRole('role');

        database.query(`UPDATE Servers SET muteRole = ? WHERE id = '${guild}';`, async (error, results, fields) => {
            if (error) {
                console.error(error);
                await interaction.reply({ content: 'A database error occurred while attempting to update the muteRole', ephemeral: true });
                return;
            }

            await interaction.reply({ content: `Set this server's mute role to <@&${role.id}>` });
        }, role.id);
    } else if (interaction.options.getSubcommand() === 'clear') {
        const guild = interaction.guildId;

        database.query(`UPDATE Servers SET muteRole = NULL WHERE id = '${guild}';`, async (error, results, fields) => {
            if (error) {
                await interaction.reply({ content: 'A database error occurred while attempting to update the muteRole', ephemeral: true });
            }

            await interaction.reply({ content: 'Cleared this server\'s mute role.' });
        });
    } else if (interaction.options.getSubcommand() === 'query') {
        const guild = interaction.guildId;

        database.query(`SELECT muteRole FROM Servers WHERE id = '${guild}';`, async (error, results, fields) => {
            if (error) {
                await interaction.reply({ content: 'A database error occurred while attempting to query the muteRole', ephemeral: true });
            }

            if (results.length === 0 || !results[0].muteRole) {
                await interaction.reply({ content: 'This server doesn\'t have a mute role' });
            } else {
                await interaction.reply({ content: `This server's mute role is <@&${results[0].muteRole}>` });
            }
        });
    }
}
