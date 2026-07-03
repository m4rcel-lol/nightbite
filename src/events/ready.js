const { Events } = require('discord.js');
const { logger } = require('../utils/logger');
const { BOT_NAME } = require('../config/constants');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Ready! Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: `${BOT_NAME} | n!help`, type: 3 }],
      status: 'dnd',
    });
  },
};
