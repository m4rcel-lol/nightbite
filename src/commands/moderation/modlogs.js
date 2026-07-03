const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');
const { paginate } = require('../../utils/pagination');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modlogs')
    .setDescription('View moderation case history')
    .addUserOption(option => option.setName('user').setDescription('View history for a specific user'))
    .addIntegerOption(option => option.setName('case_id').setDescription('View a specific case by ID')),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const caseId = context.getInteger('case_id', 1);

    if (caseId) {
      const c = await prisma.case.findFirst({
        where: { id: caseId, guildId: context.guild.id }
      });
      if (!c) {
        return context.reply({ embeds: [buildEmbed('error', { description: `Case #${caseId} not found.` })], ephemeral: true });
      }
      const embed = buildEmbed('info', {
        title: `Case #${c.id} | ${c.action.toUpperCase()}`,
        description: `**User:** <@${c.userId}>\n**Moderator:** <@${c.moderatorId}>\n**Reason:** ${c.reason}${c.duration ? `\n**Duration:** ${c.duration}` : ''}\n**Date:** <t:${Math.floor(c.createdAt.getTime() / 1000)}:F>`
      });
      return context.reply({ embeds: [embed] });
    }

    if (!targetUser) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please specify a user or a case ID.' })], ephemeral: true });
    }

    const cases = await prisma.case.findMany({
      where: { guildId: context.guild.id, userId: targetUser.id },
      orderBy: { createdAt: 'desc' },
    });

    if (cases.length === 0) {
      return context.reply({ embeds: [buildEmbed('info', { description: `**${targetUser.tag}** has no moderation history.` })] });
    }

    const itemsPerPage = 5;
    const embeds = [];

    for (let i = 0; i < cases.length; i += itemsPerPage) {
      const current = cases.slice(i, i + itemsPerPage);
      const embed = buildEmbed('info', { title: `Moderation History for ${targetUser.tag}` });
      
      let desc = '';
      for (const c of current) {
        desc += `**Case #${c.id} | ${c.action.toUpperCase()}** - <t:${Math.floor(c.createdAt.getTime() / 1000)}:d>\n`;
        desc += `**Moderator:** <@${c.moderatorId}>\n`;
        desc += `**Reason:** ${c.reason}\n\n`;
      }
      embed.setDescription(desc);
      embeds.push(embed);
    }

    await paginate(context, embeds);
  },
};
