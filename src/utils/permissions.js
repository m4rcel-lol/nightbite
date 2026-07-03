const { GuildMember, PermissionsBitField } = require('discord.js');

async function isOwner(client, userId) {
  if (!process.env.OWNER_IDS) return false;
  const ownerIds = process.env.OWNER_IDS.split(',').map(id => id.trim());
  return ownerIds.includes(userId);
}

async function hasPermissionLevel(member, guild, level) {
  if (!member || !guild) return false;

  if (await isOwner(null, member.id)) return true;

  switch (level) {
    case 'admin':
      if (member.permissions.has(PermissionsBitField.Flags.Administrator) || member.id === guild.ownerId) return true;
      break;
  }

  return false;
}

module.exports = { isOwner, hasPermissionLevel };