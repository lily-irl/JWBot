import { SlashCommandBuilder } from "discord.js";
import CommandManager from "../../../core/CommandManager.js";

export const data = new SlashCommandBuilder()
    .setName('register')
    .setDescription('Registers loaded commands');

export const execute = async (interaction, eventBus, database) => {
    eventBus.trigger('register commands');
    await interaction.reply({ content: 'Registered JWBot commands.' });
}
