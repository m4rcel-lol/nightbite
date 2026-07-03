require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { logger } = require('./utils/logger');
const { prisma } = require('./database/client');

// Basic env validation
if (!process.env.DISCORD_TOKEN) {
  logger.error('CRITICAL: DISCORD_TOKEN is missing in the environment variables.');
  process.exit(1);
}
if (!process.env.CLIENT_ID) {
  logger.error('CRITICAL: CLIENT_ID is missing in the environment variables.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// Load handlers
require('./handlers/commandHandler')(client);
require('./handlers/eventHandler')(client);

// Process event handlers for graceful shutdown and global errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled Rejection at Promise');
});

process.on('uncaughtException', (error) => {
  logger.error(error, 'Uncaught Exception thrown');
  // Optional: decide if you want to crash on uncaught exception. Usually safe to just log it if we trust the bot, but exiting is standard.
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  client.destroy();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Simple healthcheck server for Docker
const http = require('http');
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200);
    res.end('OK');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Healthcheck server listening on port ${PORT}`);
});

// Login
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  logger.error(`Failed to login: ${err.message}`);
  process.exit(1);
});
