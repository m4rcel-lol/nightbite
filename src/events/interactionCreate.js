const { Events } = require('discord.js');
const { CommandContext } = require('../structures/CommandContext');
const { getPermissionLevel, PERMISSION_LEVELS } = require('../utils/permissions');
const { checkCooldown } = require('../utils/cooldowns');
const { buildEmbed } = require('../utils/embeds');
const { logger } = require('../utils/logger');
const { prisma } = require('../database/client');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      return require('../handlers/componentHandler')(interaction, client);
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    const context = new CommandContext(interaction);

    try {
      if (interaction.guild) {
        await prisma.guild.upsert({
          where: { id: interaction.guild.id },
          update: {},
          create: { id: interaction.guild.id }
        });
      }

      // Cooldown check
      const timeLeft = checkCooldown(command.data.name, interaction.user.id, command.cooldown || 3);
      if (timeLeft) {
        return context.reply({
          embeds: [
            buildEmbed('warning', {
              description: `Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.data.name}\` command.`,
            }),
          ],
          ephemeral: true,
        });
      }

      // Permission check
      if (
        command.permissionLevel !== undefined &&
        command.permissionLevel > PERMISSION_LEVELS.EVERYONE
      ) {
        const userLevel = await getPermissionLevel(
          interaction.member,
          command.requiredScope || 'all'
        );
        if (userLevel < command.permissionLevel) {
          return context.reply({
            embeds: [
              buildEmbed('error', {
                description: "You don't have permission to use this command.",
              }),
            ],
            ephemeral: true,
          });
        }
      }

      await command.execute(context);
    } catch (error) {
      logger.error(`Error executing ${interaction.commandName}`);
      logger.error(error);

      const errorEmbed = buildEmbed('error', {
        description: 'There was an error while executing this command!',
      });

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
      }
    }
  },
};
