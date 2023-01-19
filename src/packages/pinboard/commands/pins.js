import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder } from "discord.js";

export const data = new SlashCommandBuilder()
    .setName('pins')
    .setDescription('Information about the current pinboard')
    .addSubcommand(subcommand => {
        return subcommand
            .setName('leaderboard')
            .setDescription('Gets this server\'s pin leaderboard');
    })
    .addSubcommand(subcommand => {
        return subcommand
            .setName('get')
            .setDescription('Gets your current pin total');
    });

export const execute = async (interaction, eventBus, database) => {
    if (interaction.options.getSubcommand() === 'leaderboard') {
        eventBus.trigger('pin leaderboard', interaction.guildId, async pins => {
            if (!pins) {
                await interaction.reply({ content: 'This server doesn\'t have a pinboard set up', ephemeral: true });
                return;
            }

            let first = 0;
            let last = pins.length > first + 10 ? first + 10 : pins.length;
            const pinsToDisplay = () => {
                let arr = [];
                for (let i = first; i < last; i++) {
                    arr.push(pins[i]);
                }
                return arr;
            }

            const embed = () => {
                let indices = '', users = '', counts = '';
                const entries = pinsToDisplay();
                for (let i = 0; i < entries.length; i++) {
                    indices += first + i + 1 + '.\n';
                    users += '<@' + entries[i].id + '>\n';
                    counts += entries[i].pins + '\n'
                }

                let pageNum = Math.floor(first / 10) + 1;
                let pages = Math.ceil(pins.length / 10);

                return new EmbedBuilder()
                    .addFields(
                        { name: '#', value: indices, inline: true },
                        { name: 'User', value: users, inline: true},
                        { name: 'Pins', value: counts, inline: true }
                    )
                    .setFooter({ text: 'Page ' + pageNum + '/' + pages });
            }

            const initialEmbed = embed();
            const prevButton = new ButtonBuilder()
                .setCustomId('pinboard-prev')
                .setLabel('<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true);
            const nextButton = new ButtonBuilder()
                .setCustomId('pinboard-next')
                .setLabel('>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pins.length < first + 10);
            const firstButton = new ButtonBuilder()
                .setCustomId('pinboard-first')
                .setLabel('<<')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true);
            const lastButton = new ButtonBuilder()
                .setCustomId('pinboard-last')
                .setLabel('>>')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(pins.length < first + 10);
            const row = new ActionRowBuilder().addComponents(firstButton, prevButton, nextButton, lastButton);
            const message = await interaction.reply({ embeds: [initialEmbed], components: [row] });
            const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60 * 1000 });
            collector.on('collect', i => {
                if (i.user.id !== interaction.user.id) {
                    i.reply({ content: 'Run `/pins leaderboard` to interact with your own leaderboard', ephemeral: true });
                    return;
                }
                if (i.component.customId === 'pinboard-prev') {
                    first -= 10;
                } else if (i.component.customId === 'pinboard-next') {
                    first += 10;
                } else if (i.component.customId === 'pinboard-first') {
                    first = 0;
                } else if (i.component.customId === 'pinboard-last') {
                    first = 10 * (Math.ceil(pins.length / 10) - 1);
                }
                last = pins.length > first + 10 ? first + 10 : pins.length;
                let nextEmbed = embed();
                let nextPrev = new ButtonBuilder()
                    .setCustomId('pinboard-prev')
                    .setLabel('<')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(first < 1);
                let nextNext = new ButtonBuilder()
                    .setCustomId('pinboard-next')
                    .setLabel('>')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pins.length < first + 10);
                let nextFirst = new ButtonBuilder()
                    .setCustomId('pinboard-first')
                    .setLabel('<<')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(first < 1);
                let nextLast = new ButtonBuilder()
                    .setCustomId('pinboard-last')
                    .setLabel('>>')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(pins.length < first + 10);
                let nextRow = new ActionRowBuilder().addComponents(nextFirst, nextPrev, nextNext, nextLast);
                
                i.update({ embeds: [nextEmbed], components: [nextRow] });
            });
        });
    } else if (interaction.options.getSubcommand() === 'get') {
        eventBus.trigger('pin leaderboard', interaction.guildId, async pins => {
            if (!pins) {
                await interaction.reply({ content: 'This server doesn\'t have a pinboard set up', ephemeral: true });
                return;
            }
            
            let index, count;

            for (let i = 1; i <= pins.length; i++) {
                if (pins[i - 1].id === interaction.user.id) {
                    index = i;
                    count = pins[i - 1].pins;
                    break;
                }
            }

            if (!index) {
                await interaction.reply({ content: ':pensive: <@' + interaction.user.id + '>, you haven\'t been pinned yet!' });
                return;
            }

            let emoji;

            if (index === 1) emoji = ':partying_face:';
            else if (index < 50) emoji = ':cowboy:';
            else emoji = ':pensive:';
            
            await interaction.reply({ content: emoji + ' <@' + interaction.user.id + '>, you\'re #' + index + ' with ' + count + ' pins.' }); 
        });
    }
}
