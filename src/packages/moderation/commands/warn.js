import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import timespan from "timespan-parser";

export const data = new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issues a warning to a user for breaking a rule')
    .addUserOption(option => {
        return option.setName('user')
            .setDescription('The user to ban')
            .setRequired(true);
    })
    .addStringOption(option => {
        return option.setName('reason')
            .setDescription('The reason to warn this user')
            .setRequired(true);
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

/**
 * 
 * @param {Interaction} interaction 
 * @param {EventBus} eventBus 
 * @param {Database} database 
 */
export const execute = async (interaction, eventBus, database) => {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    eventBus.trigger('warn', interaction, target, reason);
}