const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS, canModerate } = require('../../utils/permissions');
const { createCase } = require('../../utils/modLog');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to warn').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the warning').setRequired(true)
    ),

  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',

  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const reason = context.getString('reason', 1, true);

    if (!targetUser) {
      return context.reply({
        embeds: [buildEmbed('error', { description: 'Please specify a valid user to warn.' })],
        ephemeral: true,
      });
    }
    if (!reason) {
      return context.reply({
        embeds: [buildEmbed('error', { description: 'Please provide a reason for the warning.' })],
        ephemeral: true,
      });
    }

    const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);

    if (targetMember && !canModerate(context.member, targetMember)) {
      return context.reply({
        embeds: [
          buildEmbed('error', {
            description: 'You cannot warn a user with an equal or higher role.',
          }),
        ],
        ephemeral: true,
      });
    }

    try {
      const dmEmbed = buildEmbed('warning', {
        title: `You have been warned in ${context.guild.name}`,
        description: `**Reason:** ${reason}`,
      });
      await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

      await createCase({
        guild: context.guild,
        user: targetUser,
        moderator: context.user,
        action: 'warn',
        reason,
      });

      const successEmbed = buildEmbed('success', {
        description: `Warned **${targetUser.tag}**. \n**Reason:** ${reason}`,
      });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', {
        description: `Failed to warn user: ${error.message}`,
      });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
