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
                    .addChoices(
                        { name: 'Northumbria and Durham', value: 'Northumbria and Durham' },
                        { name: 'North and East Yorkshire', value: 'North and East Yorkshire' },
                        { name: 'West Yorkshire', value: 'West Yorkshire' },
                        { name: 'South Yorkshire and Wakefield', value: 'South Yorkshire and Wakefield' },
                        { name: 'Lancashire and Cumbria', value: 'Lancashire and Cumbria' },
                        { name: 'Merseyside', value: 'Merseyside' },
                        { name: 'Cheshire and Manchester South', value: 'Cheshire and Manchester South' },
                        { name: 'Manchester North', value: 'Manchester North' },
                        { name: 'Birmingham and Black Country', value: 'Birmingham and Black Country' },
                        { name: 'Shropshire and Staffordshire', value: 'Shropshire and Staffordshire' },
                        { name: 'Upper Severn', value: 'Upper Severn' },
                        { name: 'Derbyshire and Nottinghamshire', value: 'Derbyshire and Nottinghamshire' },
                        { name: 'Lincolnshire', value: 'Lincolnshire' },
                        { name: 'Leicestershire and Northamptonshire', value: 'Leicestershire and Northamptonshire' },
                        { name: 'Norfolk, Suffolk and Cambridge', value: 'Norfolk, Suffolk and Cambridge' },
                        { name: 'Bedfordshire, Hertfordshire and Huntingdonshire', value: 'Bedfordshire, Hertfordshire and Huntingdonshire' },
                        { name: 'Essex', value: 'Essex' },
                        { name: 'East London', value: 'East London' },
                        { name: 'Central London', value: 'Central London' },
                        { name: 'South London', value: 'South London' },
                        { name: 'North and West London', value: 'North and West London' },
                        { name: 'Thames Valley', value: 'Thames Valley' },
                        { name: 'Hampshire and West Surrey', value: 'Hampshire and West Surrey' },
                        { name: 'Sussex and East Surrey', value: 'Sussex and East Surrey' },
                        { name: 'Kent', value: 'Kent' },
                        { name: 'Cornwall and Devon', value: 'Cornwall and Devon' },
                        { name: 'Dorset, Wiltshire and Somerset South', value: 'Dorset, Wiltshire and Somerset South' },
                        { name: 'Avon and Gloucestershire', value: 'Avon and Gloucestershire' },
                        { name: 'Highland, Grampian and Fife', value: 'Highland, Grampian and Fife' },
                        { name: 'Edinburgh and Borders', value: 'Edinburgh and Borders' },
                        { name: 'Clydeside', value: 'Clydeside' },
                        { name: 'Mid and North Wales', value: 'Mid and North Wales' },
                        { name: 'Glamorgan and Gwent', value: 'Glamorgan and Gwent' },
                        { name: 'Belfast', value: 'Belfast' },
                        { name: 'Northern Ireland', value: 'Northern Ireland' }
                );
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
                    );
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
