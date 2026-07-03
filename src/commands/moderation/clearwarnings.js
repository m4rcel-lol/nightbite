const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription('Clear warnings for a user')
    .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
    .addIntegerOption(option => option.setName('case_id').setDescription('Specific case ID to delete').setRequired(false)),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const caseId = context.getInteger('case_id', 1);

    if (!targetUser) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please specify a valid user.' })], ephemeral: true });
    }

    if (caseId) {
      const c = await prisma.case.findFirst({
        where: { id: caseId, guildId: context.guild.id, userId: targetUser.id, action: 'warn' }
      });
      if (!c) {
        return context.reply({ embeds: [buildEmbed('error', { description: `Warning case #${caseId} not found for this user.` })], ephemeral: true });
      }
      await prisma.case.delete({ where: { id: caseId } });
      return context.reply({ embeds: [buildEmbed('success', { description: `Deleted warning case #${caseId} for **${targetUser.tag}**.` })] });
    } else {
      const result = await prisma.case.deleteMany({
        where: { guildId: context.guild.id, userId: targetUser.id, action: 'warn' }
      });
      return context.reply({ embeds: [buildEmbed('success', { description: `Cleared ${result.count} warnings for **${targetUser.tag}**.` })] });
    }
  },
};
