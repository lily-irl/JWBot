import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import axios from "axios";

export const data = new SlashCommandBuilder()
    .setName('post')
    .setDescription('Post the results (use with caution)')
    .addStringOption(option => {
        return option
            .setName('name')
            .setDescription('The list to post')
            .addChoices(
                { name: 'Scotland', value: 'Scotland' },
                { name: 'North West', value: 'North West' },
                { name: 'North East and Yorkshire', value: 'North East and Yorkshire' },
                { name: 'West Midlands', value: 'West Midlands' },
                { name: 'East Midlands', value: 'East Midlands' },
                { name: 'East of England', value: 'East of England' },
                { name: 'London', value: 'London' },
                { name: 'South East', value: 'South East' },
                { name: 'South West', value: 'South West' },
                { name: 'Wales', value: 'Wales' },
                { name: 'Northern Ireland', value: 'Northern Ireland' },
                { name: 'Overall (total national results)', value: 'Overall' }
            )
            .setRequired(true);
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const execute = async (interaction, eventBus, database) => {
    const API_ENDPOINT = 'https://electionbot.mhoc.lily-irl.com';
    const name = interaction.options.getString('name');
    axios.post(API_ENDPOINT + '/list', {
        list: name
    })
    .catch(err => {
        return interaction.reply({ content: ':x: An error occurred sending the request:\n```\n' + err + '```' });
    })
    .then(res => {
        if (!res) return;
        return interaction.reply({ content: ':white_check_mark: Posted results for **' + name + '**.' });
    })
}
