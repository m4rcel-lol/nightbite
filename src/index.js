"use strict";

const { Client, GatewayIntentBits } = require('discord.js');
const pino = require('pino');
const dotenv = require('dotenv');
dotenv.config();

const logger = pino({
  transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  level: process.env.LOG_LEVEL || 'info',
});

async function main() {
  if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    logger.error('❌ Missing required environment variables: DISCORD_TOKEN and CLIENT_ID');
    process.exit(1);
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  try {
    await client.login(process.env.DISCORD_TOKEN);
    logger.info('✅ Bot logged in successfully');
  } catch (error) {
    logger.error('❌ Failed to login to Discord:', error);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

process.on('SIGINT', () => {
  logger.info('🛑 Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('🛑 Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

main();