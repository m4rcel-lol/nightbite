const { SlashCommandBuilder, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType, RoleSelectMenuBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Quickly configure the bot for your server'),

  category: 'config',
  permissionLevel: PERMISSION_LEVELS.ADMINISTRATOR,

  async execute(context) {
    const row1 = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_modlog')
        .setPlaceholder('Select Mod Log Channel')
        .addChannelTypes(ChannelType.GuildText)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_ticketlog')
        .setPlaceholder('Select Ticket Log Channel')
        .addChannelTypes(ChannelType.GuildText)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder()
        .setCustomId('setup_muterole')
        .setPlaceholder('Select Mute Role (Optional)')
    );

    const embed = buildEmbed('info', {
      title: 'Server Setup',
      description: 'Use the dropdowns below to quickly configure your server channels and roles.\n\nChanges are saved automatically when you select an option.'
    });

    const msg = await context.reply({
      embeds: [embed],
      components: [row1, row2, row3],
      fetchReply: true,
      ephemeral: true
    });

    // Create a collector for the menus
    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === context.user.id,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (interaction) => {
      await interaction.deferUpdate();

      try {
        if (interaction.customId === 'setup_modlog') {
          const channelId = interaction.values[0];
          await prisma.guild.update({
            where: { id: interaction.guild.id },
            data: { modLogChannelId: channelId }
          });
          await interaction.followUp({ embeds: [buildEmbed('success', { description: `Mod Log channel set to <#${channelId}>` })], ephemeral: true });
        }
        else if (interaction.customId === 'setup_ticketlog') {
          const channelId = interaction.values[0];
          await prisma.guild.update({
            where: { id: interaction.guild.id },
            data: { ticketLogChannelId: channelId }
          });
          await interaction.followUp({ embeds: [buildEmbed('success', { description: `Ticket Log channel set to <#${channelId}>` })], ephemeral: true });
        }
        else if (interaction.customId === 'setup_muterole') {
          const roleId = interaction.values[0];
          await prisma.guild.update({
            where: { id: interaction.guild.id },
            data: { muteRoleId: roleId }
          });
          await interaction.followUp({ embeds: [buildEmbed('success', { description: `Mute role set to <@&${roleId}>` })], ephemeral: true });
        }
      } catch (err) {
        await interaction.followUp({ embeds: [buildEmbed('error', { description: `Failed to update configuration: ${err.message}` })], ephemeral: true });
      }
    });

    collector.on('end', () => {
      context.source.editReply({ components: [] }).catch(() => {});
    });
  },
};
