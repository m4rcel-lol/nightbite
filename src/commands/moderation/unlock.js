const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock the current channel')
    .addStringOption(option => option.setName('reason').setDescription('Reason for unlocking')),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const reason = context.getString('reason', 0, true) || 'No reason provided';

    try {
      await context.channel.permissionOverwrites.edit(context.guild.roles.everyone, {
        SendMessages: null, // Reset to default
      });

      const successEmbed = buildEmbed('success', { title: 'Channel Unlocked 🔓', description: `This channel has been unlocked by a moderator.\n**Reason:** ${reason}` });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', { description: `Failed to unlock channel: ${error.message}` });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
