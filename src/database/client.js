const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/logger');

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('warn', (e) => {
  logger.warn(`Prisma: ${e.message}`);
});

prisma.$on('error', (e) => {
  logger.error(`Prisma: ${e.message}`);
});

module.exports = { prisma };
