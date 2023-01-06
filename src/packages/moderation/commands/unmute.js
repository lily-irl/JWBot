import { SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmutes a muted user.')
    .addUserOption(option => {
        return option
            .setName('user')
            .setDescription('The user to be unmuted.')
            .setRequired(true);
    });

export const execute = async (interaction, eventBus, database) => {
    const target = interaction.options.getUser('user');
    const server = interaction.guildId;

    database.query(`SELECT network FROM Servers WHERE id = '${server}';`, async (error, results, fields) => {
        if (error) {
            console.error(error);
            await interaction.reply({ content: 'A database error occurred while trying to unmute the user', ephemeral: true });
            return;
        }

        if (!results || results.length === 0 || !results[0].network) {
            // not in a moderation network
            database.query(`SELECT id FROM Mutes WHERE id = ? AND server = '${server}';`, async (error, results, fields) => {
                if (error) {
                    console.error(error);
                    return;
                }

                if (!results || results.length === 0) {
                    // the user isn't muted
                    await interaction.reply({ content: `<@${target.id}> isn't muted.` });
                    return;
                }

                eventBus.trigger('unmute', target.id, server);
                await interaction.reply({ content: `Unmuted <@${target.id}>.` });
            }, target.id);
        } else {
            const queryString = `SELECT id, server FROM Mutes WHERE id = ? AND server IN (SELECT id FROM Servers WHERE network = '${results[0].network}');`;
            database.query(queryString, async (error, results, fields) => {
                if (error) {
                    console.error(error);
                    return;
                }

                for (let result of results) {
                    eventBus.trigger('unmute', result.id, result.server);
                }
                
                await interaction.reply({ content: `Unmuted <@${target.id}>.` });
            }, target.id);
        }
    }, target.id);
}
