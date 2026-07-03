const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS, canModerate } = require('../../utils/permissions');
const { createCase } = require('../../utils/modLog');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a timeout from a user')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to untimeout').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for removing the timeout').setRequired(false)
    ),

  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',

  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const reason = context.getString('reason', 1, true) || 'No reason provided';

    if (!targetUser) {
      return context.reply({
        embeds: [buildEmbed('error', { description: 'Please specify a valid user to untimeout.' })],
        ephemeral: true,
      });
    }

    const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return context.reply({
        embeds: [buildEmbed('error', { description: 'That user is not in the server.' })],
        ephemeral: true,
      });
    }

    if (!canModerate(context.member, targetMember)) {
      return context.reply({
        embeds: [
          buildEmbed('error', {
            description: 'You cannot untimeout a user with an equal or higher role.',
          }),
        ],
        ephemeral: true,
      });
    }

    if (!targetMember.moderatable) {
      return context.reply({
        embeds: [
          buildEmbed('error', { description: 'I do not have permission to untimeout this user.' }),
        ],
        ephemeral: true,
      });
    }

    try {
      await targetMember.timeout(null, reason);
      await createCase({
        guild: context.guild,
        user: targetUser,
        moderator: context.user,
        action: 'untimeout',
        reason,
      });

      const successEmbed = buildEmbed('success', {
        description: `Removed timeout from **${targetUser.tag}**. \n**Reason:** ${reason}`,
      });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', {
        description: `Failed to untimeout user: ${error.message}`,
      });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
