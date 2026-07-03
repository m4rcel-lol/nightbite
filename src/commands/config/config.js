const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('View or modify guild configuration')
    .addSubcommand(sub => 
      sub.setName('view')
      .setDescription('View current configuration')
    )
    .addSubcommand(sub => 
      sub.setName('prefix')
      .setDescription('Set the prefix')
      .addStringOption(option => option.setName('value').setDescription('New prefix').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('modlog')
      .setDescription('Set the modlog channel')
      .addChannelOption(option => option.setName('channel').setDescription('Channel').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('ticketlog')
      .setDescription('Set the ticket log channel')
      .addChannelOption(option => option.setName('channel').setDescription('Channel').setRequired(true))
    ),
  
  category: 'config',
  permissionLevel: PERMISSION_LEVELS.ADMINISTRATOR,
  
  async execute(context) {
    const subcommand = context.isInteraction ? context.source.options.getSubcommand() : context.args[0];

    // Ensure guild config exists
    let guildData = await prisma.guild.findUnique({ where: { id: context.guild.id } });
    if (!guildData) {
      guildData = await prisma.guild.create({ data: { id: context.guild.id } });
    }

    if (!subcommand || subcommand === 'view') {
      const embed = buildEmbed('info', {
        title: `Configuration for ${context.guild.name}`,
        fields: [
          { name: 'Prefix', value: `\`${guildData.prefix}\``, inline: true },
          { name: 'Modlog Channel', value: guildData.modLogChannelId ? `<#${guildData.modLogChannelId}>` : 'Not set', inline: true },
          { name: 'Ticket Log Channel', value: guildData.ticketLogChannelId ? `<#${guildData.ticketLogChannelId}>` : 'Not set', inline: true },
          { name: 'Max Open Tickets', value: `${guildData.ticketMaxOpen}`, inline: true },
        ]
      });
      return context.reply({ embeds: [embed] });
    }

    if (subcommand === 'prefix') {
      const val = context.getString('value', 1);
      if (!val) return context.reply({ content: 'Provide a prefix.', ephemeral: true });
      await prisma.guild.update({ where: { id: context.guild.id }, data: { prefix: val } });
      return context.reply({ embeds: [buildEmbed('success', { description: `Prefix set to \`${val}\`` })] });
    }

    if (subcommand === 'modlog') {
      const channel = context.isInteraction ? context.source.options.getChannel('channel') : null;
      if (!channel) return context.reply({ content: 'Invalid channel.', ephemeral: true });
      await prisma.guild.update({ where: { id: context.guild.id }, data: { modLogChannelId: channel.id } });
      return context.reply({ embeds: [buildEmbed('success', { description: `Modlog channel set to <#${channel.id}>` })] });
    }

    if (subcommand === 'ticketlog') {
      const channel = context.isInteraction ? context.source.options.getChannel('channel') : null;
      if (!channel) return context.reply({ content: 'Invalid channel.', ephemeral: true });
      await prisma.guild.update({ where: { id: context.guild.id }, data: { ticketLogChannelId: channel.id } });
      return context.reply({ embeds: [buildEmbed('success', { description: `Ticket log channel set to <#${channel.id}>` })] });
    }
  },
};
