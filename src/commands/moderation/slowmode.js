const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set the slowmode for the current channel')
    .addIntegerOption(option => option.setName('seconds').setDescription('Seconds between messages (0 to disable)').setMinValue(0).setMaxValue(21600).setRequired(true)),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const seconds = context.getInteger('seconds', 0);

    if (seconds === null || seconds < 0 || seconds > 21600) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please provide a valid number of seconds (0-21600).' })], ephemeral: true });
    }

    try {
      await context.channel.setRateLimitPerUser(seconds, `Slowmode set by ${context.user.tag}`);

      if (seconds === 0) {
        return context.reply({ embeds: [buildEmbed('success', { description: 'Disabled slowmode in this channel.' })] });
      } else {
        return context.reply({ embeds: [buildEmbed('success', { description: `Set slowmode in this channel to **${seconds}** seconds.` })] });
      }
    } catch (error) {
      const errorEmbed = buildEmbed('error', { description: `Failed to set slowmode: ${error.message}` });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
