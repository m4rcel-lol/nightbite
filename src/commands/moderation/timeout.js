const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS, canModerate } = require('../../utils/permissions');
const { createCase } = require('../../utils/modLog');
const { buildEmbed } = require('../../utils/embeds');
const { parseTime } = require('../../utils/time');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout (mute) a user in the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to timeout').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Duration (e.g. 10m, 1h, 2d)').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the timeout').setRequired(false)
    ),

  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',

  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const durationStr = context.getString('duration', 1);
    const reason = context.getString('reason', 2, true) || 'No reason provided';

    if (!targetUser) {
      return context.reply({
        embeds: [buildEmbed('error', { description: 'Please specify a valid user to timeout.' })],
        ephemeral: true,
      });
    }

    const durationMs = parseTime(durationStr);
    if (!durationMs || durationMs > 28 * 24 * 60 * 60 * 1000) {
      return context.reply({
        embeds: [
          buildEmbed('error', {
            description: 'Invalid duration. Use format like `10m`, `1h`, `2d`. Max is 28 days.',
          }),
        ],
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
            description: 'You cannot timeout a user with an equal or higher role.',
          }),
        ],
        ephemeral: true,
      });
    }

    if (!targetMember.moderatable) {
      return context.reply({
        embeds: [
          buildEmbed('error', {
            description:
              'I do not have permission to timeout this user. Make sure my role is higher than theirs.',
          }),
        ],
        ephemeral: true,
      });
    }

    try {
      const dmEmbed = buildEmbed('warning', {
        title: `You have been timed out in ${context.guild.name}`,
        description: `**Duration:** ${durationStr}\n**Reason:** ${reason}`,
      });
      await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

      await targetMember.timeout(durationMs, reason);
      await createCase({
        guild: context.guild,
        user: targetUser,
        moderator: context.user,
        action: 'timeout',
        reason,
        duration: durationStr,
      });

      const successEmbed = buildEmbed('success', {
        description: `Timed out **${targetUser.tag}** for ${durationStr}. \n**Reason:** ${reason}`,
      });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', {
        description: `Failed to timeout user: ${error.message}`,
      });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
