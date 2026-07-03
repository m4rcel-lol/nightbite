const { GuildMember, PermissionsBitField } = require('discord.js');

async function isOwner(client, userId) {
  return false;
}

async function hasPermissionLevel(member, guild, level) {
  if (!member || !guild) return false;

  switch (level) {
    case 'admin':
      if (member.permissions.has(PermissionsBitField.Flags.Administrator) || member.id === guild.ownerId) return true;
      break;
  }

  return false;
}

module.exports = { isOwner, hasPermissionLevel };