const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const { logger } = require('../utils/logger');

module.exports = (client) => {
  client.commands = new Collection();
  client.slashCommandsData = [];

  const commandsPath = path.join(__dirname, '..', 'commands');
  const categories = fs.readdirSync(commandsPath);

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);

    // Only process directories
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(categoryPath).filter((file) => file.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file);
      const command = require(filePath);

      if ('data' in command && 'execute' in command) {
        command.category = category; // Auto-assign category
        client.commands.set(command.data.name, command);
        client.slashCommandsData.push(command.data.toJSON());
      } else {
        logger.warn(
          `The command at ${filePath} is missing a required "data" or "execute" property.`
        );
      }
    }
  }

  logger.info(`Loaded ${client.commands.size} commands.`);
};
