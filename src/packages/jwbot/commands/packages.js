import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('packages')
    .setDescription('Displays information about installed packages.');

export const execute = async (interaction, eventBus, database) => {
    eventBus.trigger('package info', async (packages) => {
        const embed = new EmbedBuilder()
            .setDescription(packages.length + ' packages loaded.');
    
        for (let p of packages) {
            embed.addFields({
                name: p.info.name,
                value: p.info.description + ' (v' + p.info.version + ')'
            });
        }

        await interaction.reply({ embeds: [embed] });
    });
}