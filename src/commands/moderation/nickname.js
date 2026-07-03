const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS, canModerate } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Set or reset a user\'s nickname')
    .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
    .addStringOption(option => option.setName('nickname').setDescription('The new nickname (leave blank to reset)')),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const nickname = context.getString('nickname', 1, true);

    if (!targetUser) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please specify a valid user.' })], ephemeral: true });
    }

    const targetMember = await context.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'That user is not in the server.' })], ephemeral: true });
    }

    if (!canModerate(context.member, targetMember)) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'You cannot change the nickname of a user with an equal or higher role.' })], ephemeral: true });
    }

    try {
      await targetMember.setNickname(nickname || null, `Nickname changed by ${context.user.tag}`);
      
      const successEmbed = buildEmbed('success', { 
        description: nickname ? `Changed **${targetUser.tag}**'s nickname to **${nickname}**.` : `Reset **${targetUser.tag}**'s nickname.`
      });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', { description: `Failed to change nickname: ${error.message}` });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
