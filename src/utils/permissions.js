const { PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../database/client');

const OWNER_IDS = (process.env.OWNER_IDS || '').split(',').map((id) => id.trim());

const PERMISSION_LEVELS = {
  OWNER: 4,
  ADMINISTRATOR: 3,
  STAFF_MODERATION: 2,
  STAFF_TICKETS: 2,
  EVERYONE: 0,
};

/**
 * Checks a member's permission level.
 * @param {import('discord.js').GuildMember} member
 * @param {string} [requiredScope] "moderation" | "tickets" | "all"
 * @returns {Promise<number>} Returns the highest PERMISSION_LEVEL integer
 */
async function getPermissionLevel(member, requiredScope = 'all') {
  if (!member) return PERMISSION_LEVELS.EVERYONE;
  if (OWNER_IDS.includes(member.id)) return PERMISSION_LEVELS.OWNER;
  if (
    member.id === member.guild.ownerId ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  ) {
    return PERMISSION_LEVELS.ADMINISTRATOR;
  }

  // Check database for user-specific permissions
  const userStaff = await prisma.guildStaffUser.findUnique({
    where: {
      guildId_userId: { guildId: member.guild.id, userId: member.id },
    },
  });

  if (userStaff) {
    if (userStaff.scope === 'all' || userStaff.scope === requiredScope) {
      return requiredScope === 'tickets'
        ? PERMISSION_LEVELS.STAFF_TICKETS
        : PERMISSION_LEVELS.STAFF_MODERATION;
    }
  }

  // Check database for role-specific permissions
  const roles = member.roles.cache.map((r) => r.id);
  const staffRoles = await prisma.guildStaffRole.findMany({
    where: { guildId: member.guild.id, roleId: { in: roles } },
  });

  if (staffRoles.length > 0) {
    for (const r of staffRoles) {
      if (r.scope === 'all' || r.scope === requiredScope) {
        return requiredScope === 'tickets'
          ? PERMISSION_LEVELS.STAFF_TICKETS
          : PERMISSION_LEVELS.STAFF_MODERATION;
      }
    }
  }

  return PERMISSION_LEVELS.EVERYONE;
}

/**
 * Checks if the actor can moderate the target based on Discord role hierarchy
 * @param {import('discord.js').GuildMember} actor
 * @param {import('discord.js').GuildMember} target
 * @returns {boolean}
 */
function canModerate(actor, target) {
  if (OWNER_IDS.includes(actor.id)) return true;
  if (actor.id === target.guild.ownerId) return true;
  if (target.id === target.guild.ownerId) return false;

  return actor.roles.highest.position > target.roles.highest.position;
}

module.exports = {
  PERMISSION_LEVELS,
  getPermissionLevel,
  canModerate,
};
