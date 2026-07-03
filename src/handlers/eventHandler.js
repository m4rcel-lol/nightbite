const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

module.exports = (client) => {
  const eventsPath = path.join(__dirname, '..', 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  let count = 0;
  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
    count++;
  }

  logger.info(`Loaded ${count} events.`);
};
