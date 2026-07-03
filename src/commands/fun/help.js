const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { PERMISSION_LEVELS, getPermissionLevel } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show help menu for all commands'),
  
  category: 'fun',
  permissionLevel: PERMISSION_LEVELS.EVERYONE,
  
  async execute(context) {
    const commands = Array.from(context.client.commands.values());
    const userLevel = await getPermissionLevel(context.member);

    // Filter commands by permission
    const availableCommands = commands.filter(cmd => {
      const req = cmd.permissionLevel || PERMISSION_LEVELS.EVERYONE;
      return userLevel >= req;
    });

    const categories = [...new Set(availableCommands.map(cmd => cmd.category))];

    const generateEmbed = (category) => {
      const catCmds = availableCommands.filter(cmd => cmd.category === category);
      const embed = buildEmbed('info', {
        title: `Help Menu: ${category.charAt(0).toUpperCase() + category.slice(1)}`,
      });

      let desc = '';
      for (const cmd of catCmds) {
        desc += `**/${cmd.data.name}** - ${cmd.data.description}\n`;
      }
      
      embed.setDescription(desc || 'No commands available.');
      return embed;
    };

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category')
        .addOptions(categories.map(cat => ({
          label: cat.charAt(0).toUpperCase() + cat.slice(1),
          value: cat,
        })))
    );

    const initialEmbed = buildEmbed('info', {
      title: 'Nightclip Help Menu',
      description: 'Select a category from the dropdown below to view available commands.'
    });

    const reply = await context.reply({ embeds: [initialEmbed], components: [row], fetchReply: true });

    if (!reply) return;

    const collector = reply.createMessageComponentCollector({
      filter: (i) => i.user.id === context.user.id && i.customId === 'help_category_select',
      time: 60000 * 3, // 3 minutes
    });

    collector.on('collect', async (interaction) => {
      const selectedCategory = interaction.values[0];
      await interaction.update({ embeds: [generateEmbed(selectedCategory)], components: [row] });
    });

    collector.on('end', async () => {
      row.components[0].setDisabled(true);
      await reply.edit({ components: [row] }).catch(() => {});
    });
  },
};
