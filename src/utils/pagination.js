const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Sends a paginated embed using buttons
 * @param {import('../structures/CommandContext').CommandContext} context 
 * @param {import('discord.js').EmbedBuilder[]} embeds 
 */
async function paginate(context, embeds) {
  if (embeds.length === 1) {
    return context.reply({ embeds: [embeds[0]] });
  }

  let currentPage = 0;

  const getRow = (page) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_page')
        .setEmoji('◀️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setEmoji('▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === embeds.length - 1)
    );
  };

  const initialMessage = await context.reply({
    embeds: [embeds[currentPage].setFooter({ text: `Page ${currentPage + 1}/${embeds.length}` })],
    components: [getRow(currentPage)],
    fetchReply: true,
  });

  // If we can't fetch the reply (e.g. ephemeral in some cases), just return
  if (!initialMessage) return;

  const collector = initialMessage.createMessageComponentCollector({
    filter: (i) => i.user.id === context.user.id,
    time: 60000 * 5, // 5 minutes
  });

  collector.on('collect', async (interaction) => {
    if (interaction.customId === 'prev_page') {
      currentPage--;
    } else if (interaction.customId === 'next_page') {
      currentPage++;
    }

    await interaction.update({
      embeds: [embeds[currentPage].setFooter({ text: `Page ${currentPage + 1}/${embeds.length}` })],
      components: [getRow(currentPage)],
    });
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('prev_page').setEmoji('◀️').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('next_page').setEmoji('▶️').setStyle(ButtonStyle.Primary).setDisabled(true)
    );
    await initialMessage.edit({ components: [disabledRow] }).catch(() => {});
  });
}

module.exports = { paginate };
