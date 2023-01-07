import { EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Adds certain expressions to a list, logging their use')
    .addSubcommand(subcommand => {
        return subcommand.setName('add')
            .setDescription('Adds an expression to the blacklist')
            .addStringOption(option => {
                return option.setName('pattern')
                    .setDescription('The regular expression to test')
                    .setRequired(true);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand.setName('remove')
            .setDescription('Removes an expression from the blacklist')
            .addStringOption(option => {
                return option.setName('pattern')
                    .setDescription('The regular expression to remove')
                    .setRequired(true);
            });
    })
    .addSubcommand(subcommand => {
        return subcommand.setName('query')
            .setDescription('Returns this server\'s current blacklist');
    })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export const execute = async (interaction, eventBus, database) => {
    if (interaction.options.getSubcommand() === 'add') {
        const pattern = interaction.options.getString('pattern');
        const guild = interaction.guildId;

        eventBus.trigger('blacklist add', guild, pattern);

        await interaction.reply({ content: 'Blacklist updated.' });
    } else if (interaction.options.getSubcommand() === 'remove') {
        const pattern = interaction.options.getString('pattern');
        const guild = interaction.guildId;

        eventBus.trigger('blacklist remove', guild, pattern);

        await interaction.reply({ content: 'Blacklist updated.' });
    } else if (interaction.options.getSubcommand() === 'query') {
        eventBus.trigger('blacklist query', interaction.guildId, async blacklist => {
            console.log(blacklist)
            if (!blacklist || blacklist.length === 0) {
                await interaction.reply({ content: 'This server has no blacklisted expressions' });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('Blacklisted expressions in ' + interaction.guild.name);
            let list = '';

            for (let expression of blacklist) {
                expression = expression.toString();
                expression = expression.substring(1, expression.length - 1);
                list += '\n- ' + expression;
            }

            embed.setDescription(list);

            await interaction.reply({ embeds: [embed] });
        });
    }
}
