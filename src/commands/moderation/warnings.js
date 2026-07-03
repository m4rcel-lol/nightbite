const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');
const { paginate } = require('../../utils/pagination');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('List a user\'s warning history')
    .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true)),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const targetUser = await context.getUser('user', 0);

    if (!targetUser) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please specify a valid user.' })], ephemeral: true });
    }

    const cases = await prisma.case.findMany({
      where: { guildId: context.guild.id, userId: targetUser.id, action: 'warn' },
      orderBy: { createdAt: 'desc' },
    });

    if (cases.length === 0) {
      return context.reply({ embeds: [buildEmbed('info', { description: `**${targetUser.tag}** has no warnings.` })] });
    }

    const itemsPerPage = 5;
    const embeds = [];

    for (let i = 0; i < cases.length; i += itemsPerPage) {
      const current = cases.slice(i, i + itemsPerPage);
      const embed = buildEmbed('info', { title: `Warnings for ${targetUser.tag}` });
      
      let desc = '';
      for (const c of current) {
        desc += `**Case #${c.id}** - <t:${Math.floor(c.createdAt.getTime() / 1000)}:d>\n`;
        desc += `**Moderator:** <@${c.moderatorId}>\n`;
        desc += `**Reason:** ${c.reason}\n\n`;
      }
      embed.setDescription(desc);
      embeds.push(embed);
    }

    await paginate(context, embeds);
  },
};
