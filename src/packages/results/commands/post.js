import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import axios from "axios";

export const data = new SlashCommandBuilder()
    .setName('post')
    .setDescription('Post the results (use with caution)')
    .addSubcommand(subcommand => {
        return subcommand
            .setName('constituency')
            .setDescription('Post the results of a constituency (use with caution)')
            .addStringOption(option => {
                return option
                    .setName('name')
                    .setDescription('The name of the constituency')
                    .setAutocomplete(true)
                    .setRequired(true);
        });
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName('list')
            .setDescription('Post a list result (use with caution)')
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
            });
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const execute = async (interaction, eventBus, database) => {
    const API_ENDPOINT = 'https://electionbot.mhoc.lily-irl.com';
    if (interaction.options.getSubcommand() === 'constituency') {
        const name = interaction.options.getString('name');
        axios.post(API_ENDPOINT + '/constituency', {
            constituency: name
        })
        .catch(err => {
            return interaction.reply({ content: ':x: An error occurred sending the request:\n```\n' + err + '```' });
        })
        .then(res => {
            if (!res) return;
            return interaction.reply({ content: ':white_check_mark: Posted results for **' + name + '**.' });
        })
    } else if (interaction.options.getSubcommand() === 'list') {
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
}

// only for the constituency
export const autocomplete = async (interaction) => {
    const focusedValue = interaction.options.getFocused();
    const choices = [
        'Northumbria and Durham',
        'North and East Yorkshire',
        'West Yorkshire',
        'South Yorkshire and Wakefield',
        'Lancashire and Cumbria',
        'Merseyside',
        'Cheshire and Manchester South',
        'Manchester North',
        'Birmingham and Black Country',
        'Shropshire and Staffordshire',
        'Upper Severn',
        'Derbyshire and Nottinghamshire',
        'Lincolnshire',
        'Leicestershire and Northamptonshire',
        'Norfolk, Suffolk and Cambridge',
        'Bedfordshire, Hertfordshire and Huntingdonshire',
        'Essex',
        'East London',
        'Central London',
        'South London',
        'North and West London',
        'Thames Valley',
        'Hampshire and West Surrey',
        'Sussex and East Surrey',
        'Kent',
        'Cornwall and Devon',
        'Dorset, Wiltshire and Somerset South',
        'Avon and Gloucestershire',
        'Highland, Grampian and Fife',
        'Edinburgh and Borders',
        'Clydeside',
        'Mid and North Wales',
        'Glamorgan and Gwent',
        'Belfast',
        'Northern Ireland'
    ];
    const filtered = choices.filter(choice => choice.toLowerCase().startsWith(focusedValue));

    if (filtered.length > 25) {
        await interaction.respond([]);
    } else {
        await interaction.respond(
            filtered.map(choice => ({ name: choice, value: choice })),
        );
    }
}
