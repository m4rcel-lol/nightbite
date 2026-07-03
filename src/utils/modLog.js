const { prisma } = require('../database/client');
const { buildEmbed } = require('./embeds');
const { logger } = require('./logger');

/**
 * Creates a moderation case and logs it to the modlog channel
 * @param {Object} params
 * @param {import('discord.js').Guild} params.guild
 * @param {import('discord.js').User} params.user
 * @param {import('discord.js').User} params.moderator
 * @param {string} params.action "ban", "kick", "warn", "timeout", "untimeout", "unban", "softban"
 * @param {string} [params.reason]
 * @param {string} [params.duration]
 * @returns {Promise<import('@prisma/client').Case>}
 */
async function createCase({ guild, user, moderator, action, reason, duration }) {
  // 1. Save to DB
  const modCase = await prisma.case.create({
    data: {
      guildId: guild.id,
      userId: user.id,
      moderatorId: moderator.id,
      action,
      reason: reason || 'No reason provided',
      duration,
    },
  });

  // 2. Fetch guild config to find modlog channel
  try {
    const guildConfig = await prisma.guild.findUnique({ where: { id: guild.id } });
    if (guildConfig && guildConfig.modLogChannelId) {
      const channel = guild.channels.cache.get(guildConfig.modLogChannelId);
      if (channel && channel.isTextBased()) {
        const embed = buildEmbed('info', {
          title: `Case #${modCase.id} | ${action.toUpperCase()}`,
          description: `**User:** ${user.tag} (<@${user.id}>)\n**Moderator:** ${moderator.tag} (<@${moderator.id}>)\n**Reason:** ${modCase.reason}${duration ? `\n**Duration:** ${duration}` : ''}`,
        });
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  } catch (error) {
    logger.error(`Failed to post modlog case #${modCase.id}: ${error.message}`);
  }

  return modCase;
}

module.exports = { createCase };
