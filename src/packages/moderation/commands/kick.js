import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a user from every server in the moderation network.')
    .addUserOption(option => {
        return option
            .setName('user')
            .setDescription('The user to kick')
            .setRequired(true);
    })
    .addStringOption(option => {
        return option
            .setName('reason')
            .setDescription('The reason why the user is being kicked');
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers | PermissionFlagsBits.BanMembers);

export const execute = async (interaction, eventBus, database) => {
    const target = interaction.options.getUser('user');
    const server = interaction.guildId;
    const reason = interaction.options.getString('reason') ?? 'No reason provided.';

    database.query(`SELECT network FROM Servers WHERE id = '${server}';`, async (error, results, fields) => {
        if (error) {
            console.error(error);
            await interaction.reply({ content: 'A database error occurred while kicking the user.', ephemeral: true });
            return;
        }

        if (!results || results.length === 0 || !results[0].network) {
            // not in a moderation network
            eventBus.trigger('kick', interaction.guild.name, target.id, interaction.member.id, server, reason);
            await interaction.reply({ content: `Kicked <@${target.id}> for ${reason}`, ephemeral: true });
        } else {
            database.query(`SELECT id FROM Servers WHERE network = '${results[0].network}';`, async (error, results, fields) => {
                if (error || !results || results.length === 0) {
                    console.error(error);
                    await interaction.reply({ content: 'A database error occurred while kicking the user.', ephemeral: true });
                    return;
                }

                for (let result of results) {
                    eventBus.trigger('kick', interaction.guild.name, target.id, interaction.member.id, result.id, reason);
                }

                await interaction.reply({ content: `Kicked <@${target.id}> for ${reason}`, ephemeral: true });
            });
        }
    });
}
