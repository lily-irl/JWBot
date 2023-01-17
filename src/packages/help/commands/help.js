import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import { default as config } from "../../../../package.json" assert { type: 'json' };

export const data = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Lists JWBot\'s commands.');

export const execute = async (interaction, eventBus, database) => {
    const commands = await interaction.client.application.commands.fetch();
    const embed = new EmbedBuilder()
        .setTitle('Command reference for JWBot')
        .setAuthor({ name: interaction.client.user.username + ' version ' + config.version, iconURL: interaction.client.user.displayAvatarURL(), url: 'https://github.com/lily-irl/JWBot' })
        .setFooter({ text: 'More information about each command is available when typing it through Discord autocompletion' });
    
    let reference = '';

    commands.forEach(command => {
        reference += '`/' + command.name + '`: ' + command.description + '\n';
    });

    embed.setDescription(reference);

    await interaction.reply({ embeds: [embed] });
}
