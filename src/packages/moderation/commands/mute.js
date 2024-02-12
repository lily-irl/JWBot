import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import timespan from "timespan-parser";

export const data = new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mutes a user from every server in this network')
    .addUserOption(option => {
        return option.setName('user')
            .setDescription('The user to mute')
            .setRequired(true);
    })
    .addStringOption(option => {
        return option.setName('violation')
            .setDescription('The rule that this user has violated')
            .addChoices(
                { name: 'Rule 1 - no spam', value: 'Rule 1 - no spam' },
                { name: 'Rule 2 - no NSFW content', value: 'Rule 2 - no NSFW content' },
                { name: 'Rule 3 - be respectful and tolerant towards others', value: 'Rule 3 - be respectful and tolerant towards others' },
                { name: 'Other', value: 'other' }
            )
            .setRequired(true);
    })
    .addStringOption(option => {
        return option.setName('reason')
            .setDescription('The specific reason this user is muted');
    })
    .addStringOption(option => {
        return option.setName('duration')
            .setDescription('The amount of time the user should be muted, if temporary');
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers | PermissionFlagsBits.KickMembers);

/**
 * 
 * @param {Interaction} interaction 
 * @param {EventBus} eventBus 
 * @param {Database} database 
 */
export const execute = async (interaction, eventBus, database) => {
    const target = interaction.options.getUser('user');
    let reason;
    let duration = interaction.options.getString('duration') ?? 0;
    let expires = null;

    if (interaction.options.getString('violation') === 'other')
        reason = interaction.options.getString('reason') ?? 'No reason provided.';
    else {
        reason = interaction.options.getString('violation');
        if (interaction.options.getString('reason'))
            reason += '\n' + interaction.options.getString('reason');
    }

    if (duration !== 0) {
        try {
            duration = timespan.parse(duration, 'ms');
        } catch (error) {
            await interaction.reply({ content: `Couldn't coerce '${interaction.options.getString('duration')}' into a timespan, valid options are listed at https://www.npmjs.com/package/timespan-parser`, ephemeral: true });
            return;
        }
        const current = Date.now();
        expires = new Date(current + duration);
        
        if (expires < current + 60 * 1000) {
            await interaction.reply({ content: 'A mute must be at least 1 minute long', ephemeral: true });
            return;
        }
    }

    eventBus.trigger('mute', interaction, target, reason, expires);
}
