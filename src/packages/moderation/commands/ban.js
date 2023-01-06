import { SlashCommandBuilder } from "discord.js";
import timespan from "timespan-parser";
import Ban from "../Ban.js";

export const data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from every server in this network')
    .addUserOption(option => {
        return option.setName('user')
            .setDescription('The user to ban')
            .setRequired(true);
    })
    .addStringOption(option => {
        return option.setName('duration')
            .setDescription('The amount of time the user should be banned, if temporary');
    })
    .addStringOption(option => {
        return option.setName('reason')
            .setDescription('The reason this user is banned');
    });

/**
 * 
 * @param {Interaction} interaction 
 * @param {EventBus} eventBus 
 * @param {Database} database 
 */
export const execute = async (interaction, eventBus, database) => {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided.';
    let duration = interaction.options.getString('duration') ?? 0;

    await interaction.reply({ content: `Ban ${target.username} for ${duration ?? "ever"} for ${reason}`})
}