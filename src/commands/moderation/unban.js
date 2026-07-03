const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { createCase } = require('../../utils/modLog');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addUserOption(option => option.setName('user').setDescription('The user ID to unban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the unban').setRequired(true)),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const reason = context.getString('reason', 1, true) || 'No reason provided';

    if (!targetUser) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please specify a valid user to unban.' })], ephemeral: true });
    }

    try {
      await context.guild.members.unban(targetUser.id, reason);
      await createCase({ guild: context.guild, user: targetUser, moderator: context.user, action: 'unban', reason });

      const successEmbed = buildEmbed('success', { description: `Unbanned **${targetUser.tag}**. \n**Reason:** ${reason}` });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', { description: `Failed to unban user (they might not be banned): ${error.message}` });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
