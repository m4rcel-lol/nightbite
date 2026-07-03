const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS, canModerate } = require('../../utils/permissions');
const { createCase } = require('../../utils/modLog');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and immediately unban a user to purge their recent messages')
    .addUserOption(option => option.setName('user').setDescription('The user to softban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the softban').setRequired(true)),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const reason = context.getString('reason', 1, true) || 'No reason provided';

    if (!targetUser) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please specify a valid user to softban.' })], ephemeral: true });
    }

    const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetMember) {
      if (!canModerate(context.member, targetMember)) {
        return context.reply({ embeds: [buildEmbed('error', { description: 'You cannot softban a user with an equal or higher role.' })], ephemeral: true });
      }

      if (!targetMember.bannable) {
        return context.reply({ embeds: [buildEmbed('error', { description: 'I do not have permission to ban this user.' })], ephemeral: true });
      }
    }

    try {
      await context.guild.members.ban(targetUser.id, { reason: `Softban: ${reason}`, deleteMessageSeconds: 7 * 86400 });
      await context.guild.members.unban(targetUser.id, 'Softban complete');
      
      await createCase({ guild: context.guild, user: targetUser, moderator: context.user, action: 'softban', reason });

      const successEmbed = buildEmbed('success', { description: `Softbanned **${targetUser.tag}**. \n**Reason:** ${reason}` });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', { description: `Failed to softban user: ${error.message}` });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
