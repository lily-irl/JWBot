import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('say')
    .setDescription('Posts a message in #election-results')
    .addStringOption(option => {
        return option
            .setName('text')
            .setDescription('The text to print')
            .setRequired(true);
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const execute = async (interaction, eventBus, database) => {
    const text = interaction.options.getString('text');
    const API_ENDPOINT = 'https://electionbot.mhoc.lily-irl.com';
    axios.post(API_ENDPOINT + '/message', {
        message: text
    })
    .catch(err => {
        return interaction.reply({ content: ':x: An error occurred sending the request:\n```\n' + err + '```' });
    })
    .then(res => {
        if (!res) return;
        return interaction.reply({ content: ':white_check_mark: Posted results for **' + name + '**.' });
    })
};
