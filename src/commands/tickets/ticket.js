const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');
const { closeTicket } = require('../../utils/ticketManager');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage tickets')
    .addSubcommand(sub => 
      sub.setName('close')
      .setDescription('Close the current ticket')
      .addStringOption(option => option.setName('reason').setDescription('Reason for closing'))
    )
    .addSubcommand(sub => 
      sub.setName('claim')
      .setDescription('Claim the current ticket')
    )
    .addSubcommand(sub => 
      sub.setName('add')
      .setDescription('Add a member to the ticket')
      .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('remove')
      .setDescription('Remove a member from the ticket')
      .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
    )
    .addSubcommand(sub => 
      sub.setName('stats')
      .setDescription('View ticket statistics for staff')
      .addUserOption(option => option.setName('staff').setDescription('Specific staff member (leave blank for leaderboard)'))
    )
    .addSubcommandGroup(group =>
      group.setName('blacklist')
      .setDescription('Manage ticket blacklist')
      .addSubcommand(sub => 
        sub.setName('add')
        .setDescription('Add a user to the blacklist')
        .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Reason for blacklisting'))
      )
      .addSubcommand(sub => 
        sub.setName('remove')
        .setDescription('Remove a user from the blacklist')
        .addUserOption(option => option.setName('user').setDescription('The user').setRequired(true))
      )
    ),
  
  category: 'tickets',
  permissionLevel: PERMISSION_LEVELS.STAFF_TICKETS,
  requiredScope: 'tickets',
  
  async execute(context) {
    // In slash, it could be a nested subcommand. In prefix, we just split.
    const group = context.isInteraction ? context.source.options.getSubcommandGroup(false) : null;
    const subcommand = context.isInteraction ? context.source.options.getSubcommand() : context.args[0];

    if (group === 'blacklist' || subcommand === 'blacklist') {
      const targetUser = await context.getUser('user', 2);
      if (!targetUser) return context.reply({ content: 'Invalid user.', ephemeral: true });

      const action = context.isInteraction ? subcommand : context.args[1];

      if (action === 'add') {
        const reason = context.getString('reason', 3, true) || 'No reason';
        await prisma.ticketBlacklist.upsert({
          where: { guildId_userId: { guildId: context.guild.id, userId: targetUser.id } },
          update: { reason, addedBy: context.user.id },
          create: { guildId: context.guild.id, userId: targetUser.id, reason, addedBy: context.user.id }
        });
        return context.reply({ embeds: [buildEmbed('success', { description: `Blacklisted <@${targetUser.id}> from opening tickets.` })] });
      } else if (action === 'remove') {
        await prisma.ticketBlacklist.deleteMany({ where: { guildId: context.guild.id, userId: targetUser.id } });
        return context.reply({ embeds: [buildEmbed('success', { description: `Removed <@${targetUser.id}> from ticket blacklist.` })] });
      }
      return;
    }

    if (subcommand === 'stats') {
      const staffUser = await context.getUser('staff', 1);

      if (staffUser) {
        const ratings = await prisma.ticketRating.findMany({ where: { staffId: staffUser.id } });
        const claimed = await prisma.ticket.count({ where: { guildId: context.guild.id, claimedBy: staffUser.id } });
        
        let avgRating = 0;
        if (ratings.length > 0) {
          avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        }

        const embed = buildEmbed('info', {
          title: `Ticket Stats for ${staffUser.tag}`,
          fields: [
            { name: 'Tickets Claimed', value: `${claimed}`, inline: true },
            { name: 'Ratings Received', value: `${ratings.length}`, inline: true },
            { name: 'Average Rating', value: `${avgRating.toFixed(1)} ⭐`, inline: true },
          ]
        });
        return context.reply({ embeds: [embed] });
      } else {
        // Leaderboard logic can go here. For now, simplistic reply.
        return context.reply({ content: 'Leaderboard coming soon! (Use /ticket stats staff:@user for now)', ephemeral: true });
      }
    }

    // Following commands require to be in a ticket channel
    const ticket = await prisma.ticket.findUnique({ where: { channelId: context.channel.id } });
    if (!ticket || ticket.status === 'closed') {
      return context.reply({ embeds: [buildEmbed('error', { description: 'This channel is not an active ticket.' })], ephemeral: true });
    }

    if (subcommand === 'close') {
      const reason = context.getString('reason', 1, true) || 'Closed via command';
      await context.reply({ embeds: [buildEmbed('success', { description: 'Closing ticket...' })] });
      await closeTicket(ticket.id, context.member, reason);
    } 
    else if (subcommand === 'claim') {
      await prisma.ticket.update({ where: { id: ticket.id }, data: { claimedBy: context.user.id } });
      await context.reply({ embeds: [buildEmbed('success', { description: `Ticket claimed by <@${context.user.id}>.` })] });
    }
    else if (subcommand === 'add') {
      const targetUser = await context.getUser('user', 1);
      if (!targetUser) return context.reply({ content: 'Invalid user.', ephemeral: true });
      await context.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: true, SendMessages: true });
      await context.reply({ embeds: [buildEmbed('success', { description: `Added <@${targetUser.id}> to the ticket.` })] });
    }
    else if (subcommand === 'remove') {
      const targetUser = await context.getUser('user', 1);
      if (!targetUser) return context.reply({ content: 'Invalid user.', ephemeral: true });
      await context.channel.permissionOverwrites.delete(targetUser.id);
      await context.reply({ embeds: [buildEmbed('success', { description: `Removed <@${targetUser.id}> from the ticket.` })] });
    }
  },
};
