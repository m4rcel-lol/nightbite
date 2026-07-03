const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS, canModerate } = require('../../utils/permissions');
const { createCase } = require('../../utils/modLog');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('delete_messages_days')
        .setDescription('Days of messages to delete')
        .setMinValue(0)
        .setMaxValue(7)
    ),

  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',

  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const reason = context.getString('reason', 1, true) || 'No reason provided';
    const deleteDays = context.getInteger('delete_messages_days', 2) || 0;

    if (!targetUser) {
      return context.reply({
        embeds: [buildEmbed('error', { description: 'Please specify a valid user to ban.' })],
        ephemeral: true,
      });
    }

    const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetMember) {
      if (!canModerate(context.member, targetMember)) {
        return context.reply({
          embeds: [
            buildEmbed('error', {
              description: 'You cannot ban a user with an equal or higher role.',
            }),
          ],
          ephemeral: true,
        });
      }

      if (!targetMember.bannable) {
        return context.reply({
          embeds: [
            buildEmbed('error', {
              description:
                'I do not have permission to ban this user. Make sure my role is higher than theirs.',
            }),
          ],
          ephemeral: true,
        });
      }

      // Try DMing before ban
      try {
        const dmEmbed = buildEmbed('error', {
          title: `You have been banned from ${context.guild.name}`,
          description: `**Reason:** ${reason}`,
        });
        await targetUser.send({ embeds: [dmEmbed] });
      } catch (e) {
        // Ignore DM failures
      }
    }

    try {
      await context.guild.members.ban(targetUser.id, {
        reason,
        deleteMessageSeconds: deleteDays * 86400,
      });
      await createCase({
        guild: context.guild,
        user: targetUser,
        moderator: context.user,
        action: 'ban',
        reason,
      });

      const successEmbed = buildEmbed('success', {
        description: `Banned **${targetUser.tag}**. \n**Reason:** ${reason}`,
      });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', {
        description: `Failed to ban user: ${error.message}`,
      });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
