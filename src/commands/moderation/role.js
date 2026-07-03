const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS, canModerate } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Add or remove a role from a member')
    .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
    .addRoleOption(option => option.setName('role').setDescription('The role to toggle').setRequired(true)),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const roleId = context.isInteraction ? context.source.options.getRole('role').id : context.args[1]?.replace(/<@&|>/g, '');

    if (!targetUser || !roleId) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please specify a valid user and role.' })], ephemeral: true });
    }

    const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);
    const role = context.guild.roles.cache.get(roleId);

    if (!targetMember) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'That user is not in the server.' })], ephemeral: true });
    }
    if (!role) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Role not found.' })], ephemeral: true });
    }

    if (!canModerate(context.member, targetMember) && context.member.id !== context.guild.ownerId) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'You cannot manage roles for a user with an equal or higher role.' })], ephemeral: true });
    }

    // Role hierarchy check against the role being assigned
    if (context.member.id !== context.guild.ownerId && context.member.roles.highest.position <= role.position) {
        return context.reply({ embeds: [buildEmbed('error', { description: 'You cannot assign a role equal to or higher than your own highest role.' })], ephemeral: true });
    }

    if (context.guild.members.me.roles.highest.position <= role.position) {
        return context.reply({ embeds: [buildEmbed('error', { description: 'I cannot assign a role equal to or higher than my own highest role.' })], ephemeral: true });
    }

    try {
      if (targetMember.roles.cache.has(role.id)) {
        await targetMember.roles.remove(role, `Role removed by ${context.user.tag}`);
        return context.reply({ embeds: [buildEmbed('success', { description: `Removed <@&${role.id}> from <@${targetUser.id}>.` })] });
      } else {
        await targetMember.roles.add(role, `Role added by ${context.user.tag}`);
        return context.reply({ embeds: [buildEmbed('success', { description: `Added <@&${role.id}> to <@${targetUser.id}>.` })] });
      }
    } catch (error) {
      const errorEmbed = buildEmbed('error', { description: `Failed to manage role: ${error.message}` });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
