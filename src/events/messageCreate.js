const { Events } = require('discord.js');
const { CommandContext } = require('../structures/CommandContext');
const { getPermissionLevel, PERMISSION_LEVELS } = require('../utils/permissions');
const { checkCooldown } = require('../utils/cooldowns');
const { buildEmbed } = require('../utils/embeds');
const { logger } = require('../utils/logger');
const { prisma } = require('../database/client');
const { DEFAULT_PREFIX } = require('../config/constants');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Fetch prefix from DB (could be cached in real life to avoid query per message)
    let prefix = DEFAULT_PREFIX;
    try {
      const guildData = await prisma.guild.upsert({
        where: { id: message.guild.id },
        update: {},
        create: { id: message.guild.id, prefix: DEFAULT_PREFIX }
      });
      if (guildData && guildData.prefix) {
        prefix = guildData.prefix;
      }
    } catch (e) {
      logger.error(`Failed to fetch guild prefix: ${e.message}`);
    }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    // Could add alias support here if needed
    if (!command) return;

    const context = new CommandContext(message, args);

    try {
      // Cooldown check
      const timeLeft = checkCooldown(command.data.name, message.author.id, command.cooldown || 3);
      if (timeLeft) {
        return context.reply({
          embeds: [
            buildEmbed('warning', {
              description: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`,
            }),
          ],
        });
      }

      // Permission check
      if (
        command.permissionLevel !== undefined &&
        command.permissionLevel > PERMISSION_LEVELS.EVERYONE
      ) {
        const userLevel = await getPermissionLevel(message.member, command.requiredScope || 'all');
        if (userLevel < command.permissionLevel) {
          return context.reply({
            embeds: [
              buildEmbed('error', {
                description: "You don't have permission to use this command.",
              }),
            ],
          });
        }
      }

      await command.execute(context);
    } catch (error) {
      logger.error(`Error executing prefix command ${commandName}`);
      logger.error(error);

      const errorEmbed = buildEmbed('error', {
        description: 'There was an error while executing this command!',
      });
      await context.reply({ embeds: [errorEmbed] }).catch(() => {});
    }
  },
};
