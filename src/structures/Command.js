const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

function createCommand(name, description, category, cooldown = 3, permissionLevel = 'everyone', options = []) {
  const command = {
    name,
    description,
    category,
    cooldown,
    permissionLevel,
    options,
    toJSON() {
      return new SlashCommandBuilder()
        .setName(this.name)
        .setDescription(this.description)
        .addOptions(this.options)
        .toJSON();
    },
  };

  return command;
}

module.exports = { createCommand };