import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Registers loaded commands')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const execute = async (interaction, eventBus, database) => {
    eventBus.trigger('register commands');
    await interaction.reply({ content: 'Registered JWBot commands.' });
}
