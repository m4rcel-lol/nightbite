const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Manage staff permissions')
    .addSubcommand(sub => 
      sub.setName('add-role')
      .setDescription('Grant staff access to a role')
      .addRoleOption(option => option.setName('role').setDescription('Role').setRequired(true))
      .addStringOption(option => option.setName('scope').setDescription('Scope (all, moderation, tickets)').addChoices(
        { name: 'All', value: 'all' },
        { name: 'Moderation Only', value: 'moderation' },
        { name: 'Tickets Only', value: 'tickets' }
      ))
    )
    .addSubcommand(sub => 
      sub.setName('remove-role')
      .setDescription('Remove staff access from a role')
      .addRoleOption(option => option.setName('role').setDescription('Role').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('add-user')
      .setDescription('Grant staff access to a user')
      .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
      .addStringOption(option => option.setName('scope').setDescription('Scope (all, moderation, tickets)').addChoices(
        { name: 'All', value: 'all' },
        { name: 'Moderation Only', value: 'moderation' },
        { name: 'Tickets Only', value: 'tickets' }
      ))
    )
    .addSubcommand(sub => 
      sub.setName('remove-user')
      .setDescription('Remove staff access from a user')
      .addUserOption(option => option.setName('user').setDescription('User').setRequired(true))
    ),
  
  category: 'config',
  permissionLevel: PERMISSION_LEVELS.ADMINISTRATOR,
  
  async execute(context) {
    const subcommand = context.isInteraction ? context.source.options.getSubcommand() : context.args[0];

    // Ensure guild exists
    const guildData = await prisma.guild.findUnique({ where: { id: context.guild.id } });
    if (!guildData) await prisma.guild.create({ data: { id: context.guild.id } });

    if (subcommand === 'add-role') {
      const role = context.isInteraction ? context.source.options.getRole('role') : null; // simplified prefix fallback
      const scope = context.getString('scope') || 'all';
      if (!role) return context.reply({ content: 'Invalid role.' });

      await prisma.guildStaffRole.upsert({
        where: { guildId_roleId: { guildId: context.guild.id, roleId: role.id } },
        update: { scope },
        create: { guildId: context.guild.id, roleId: role.id, scope }
      });
      return context.reply({ embeds: [buildEmbed('success', { description: `Granted \`${scope}\` staff access to <@&${role.id}>.` })] });
    }

    if (subcommand === 'remove-role') {
      const role = context.isInteraction ? context.source.options.getRole('role') : null;
      if (!role) return context.reply({ content: 'Invalid role.' });
      await prisma.guildStaffRole.deleteMany({ where: { guildId: context.guild.id, roleId: role.id } });
      return context.reply({ embeds: [buildEmbed('success', { description: `Removed staff access from <@&${role.id}>.` })] });
    }

    if (subcommand === 'add-user') {
      const user = await context.getUser('user', 1);
      const scope = context.getString('scope') || 'all';
      if (!user) return context.reply({ content: 'Invalid user.' });

      await prisma.guildStaffUser.upsert({
        where: { guildId_userId: { guildId: context.guild.id, userId: user.id } },
        update: { scope },
        create: { guildId: context.guild.id, userId: user.id, scope }
      });
      return context.reply({ embeds: [buildEmbed('success', { description: `Granted \`${scope}\` staff access to <@${user.id}>.` })] });
    }

    if (subcommand === 'remove-user') {
      const user = await context.getUser('user', 1);
      if (!user) return context.reply({ content: 'Invalid user.' });
      await prisma.guildStaffUser.deleteMany({ where: { guildId: context.guild.id, userId: user.id } });
      return context.reply({ embeds: [buildEmbed('success', { description: `Removed staff access from <@${user.id}>.` })] });
    }
  },
};
