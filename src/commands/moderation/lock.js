const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock the current channel')
    .addStringOption(option => option.setName('reason').setDescription('Reason for locking')),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const reason = context.getString('reason', 0, true) || 'No reason provided';

    try {
      await context.channel.permissionOverwrites.edit(context.guild.roles.everyone, {
        SendMessages: false,
      });

      const successEmbed = buildEmbed('success', { title: 'Channel Locked 🔒', description: `This channel has been locked by a moderator.\n**Reason:** ${reason}` });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', { description: `Failed to lock channel: ${error.message}` });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
