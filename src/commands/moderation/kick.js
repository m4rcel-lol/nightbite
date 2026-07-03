const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS, canModerate } = require('../../utils/permissions');
const { createCase } = require('../../utils/modLog');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to kick').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the kick').setRequired(true)
    ),

  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',

  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const reason = context.getString('reason', 1, true) || 'No reason provided';

    if (!targetUser) {
      return context.reply({
        embeds: [buildEmbed('error', { description: 'Please specify a valid user to kick.' })],
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
            description: 'You cannot kick a user with an equal or higher role.',
          }),
        ],
        ephemeral: true,
      });
    }

    if (!targetMember.kickable) {
      return context.reply({
        embeds: [
          buildEmbed('error', {
            description:
              'I do not have permission to kick this user. Make sure my role is higher than theirs.',
          }),
        ],
        ephemeral: true,
      });
    }

    // Try DMing before kick
    try {
      const dmEmbed = buildEmbed('error', {
        title: `You have been kicked from ${context.guild.name}`,
        description: `**Reason:** ${reason}`,
      });
      await targetUser.send({ embeds: [dmEmbed] });
    } catch (e) {
      // Ignore DM failures
    }

    try {
      await targetMember.kick(reason);
      await createCase({
        guild: context.guild,
        user: targetUser,
        moderator: context.user,
        action: 'kick',
        reason,
      });

      const successEmbed = buildEmbed('success', {
        description: `Kicked **${targetUser.tag}**. \n**Reason:** ${reason}`,
      });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', {
        description: `Failed to kick user: ${error.message}`,
      });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
