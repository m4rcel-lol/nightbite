const { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const { prisma } = require('../database/client');
const { buildEmbed } = require('./embeds');
const { logger } = require('./logger');

/**
 * Generates the action row for the main ticket message
 */
function getTicketButtons(ticket) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_close_${ticket.id}`)
      .setLabel('Close')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`ticket_claim_${ticket.id}`)
      .setLabel(ticket.claimedBy ? 'Unclaim' : 'Claim')
      .setEmoji('🙋‍♂️')
      .setStyle(ticket.claimedBy ? ButtonStyle.Secondary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`ticket_members_${ticket.id}`)
      .setLabel('Members')
      .setEmoji('👥')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ticket_priority_${ticket.id}`)
      .setLabel('Priority')
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Create a new ticket
 */
async function createTicket(guild, user, categoryId, intakeAnswers = []) {
  const guildConfig = await prisma.guild.findUnique({ where: { id: guild.id } });
  if (!guildConfig) throw new Error('Guild not configured.');

  // Check blacklist
  const blacklisted = await prisma.ticketBlacklist.findUnique({ where: { guildId_userId: { guildId: guild.id, userId: user.id } } });
  if (blacklisted) throw new Error('You are blacklisted from opening tickets.');

  // Check limits
  const openCount = await prisma.ticket.count({ where: { guildId: guild.id, openerId: user.id, status: 'open' } });
  if (openCount >= guildConfig.ticketMaxOpen) throw new Error(`You can only have ${guildConfig.ticketMaxOpen} open tickets at a time.`);

  const category = await prisma.ticketCategory.findUnique({ where: { id: parseInt(categoryId) } });
  if (!category) throw new Error('Category not found.');

  // Create DB entry first to get the sequential ID
  const ticket = await prisma.ticket.create({
    data: {
      guildId: guild.id,
      openerId: user.id,
      categoryId: category.id,
      channelId: 'pending', // update later
    }
  });

  const channelName = `ticket-${user.username.replace(/[^a-zA-Z0-9]/g, '')}-${ticket.id}`.toLowerCase();
  
  let channel;
  const supportRoles = category.supportRoles.split(',');

  if (guildConfig.ticketPrivateThreads) {
    // If threads, we need a parent channel. For this implementation, we fallback to channels if no logic exists for parents
    // We'll stick to standard private channels by default.
  }

  // Create standard private channel
  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles],
    },
    {
      id: guild.client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages],
    }
  ];

  for (const roleId of supportRoles) {
    if (roleId) {
      permissionOverwrites.push({
        id: roleId.trim(),
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      });
    }
  }

  channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites,
  });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { channelId: channel.id },
  });

  const fields = [];
  if (intakeAnswers.length > 0) {
    intakeAnswers.forEach(ans => fields.push({ name: ans.question, value: ans.answer || 'N/A' }));
  }

  const welcomeEmbed = buildEmbed('info', {
    title: `${category.emoji ? category.emoji + ' ' : ''}${category.name} Ticket`,
    description: `Welcome <@${user.id}>! Support will be with you shortly.`,
    fields,
  });

  await channel.send({ content: `<@${user.id}> ${supportRoles.map(r => `<@&${r.trim()}>`).join(' ')}`, embeds: [welcomeEmbed], components: [getTicketButtons(ticket)] });

  return { ticket, channel };
}

/**
 * Close a ticket
 */
async function closeTicket(ticketId, closedBy, reason = 'No reason provided') {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { category: true } });
  if (!ticket || ticket.status === 'closed') return;

  const guild = closedBy.guild;
  const channel = guild.channels.cache.get(ticket.channelId);
  const guildConfig = await prisma.guild.findUnique({ where: { id: guild.id } });

  let transcriptFile = null;

  if (channel) {
    try {
      const attachment = await discordTranscripts.createTranscript(channel, {
        limit: -1,
        returnType: 'attachment',
        filename: `ticket-${ticket.id}.html`,
        saveImages: true,
        poweredBy: false,
      });
      transcriptFile = attachment;
    } catch (e) {
      logger.error(`Failed to generate transcript for ticket ${ticket.id}: ${e.message}`);
    }
  }

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'closed',
      closedAt: new Date(),
      closeReason: reason,
    }
  });

  // Log to ticket log channel
  if (guildConfig && guildConfig.ticketLogChannelId) {
    const logChannel = guild.channels.cache.get(guildConfig.ticketLogChannelId);
    if (logChannel) {
      const logEmbed = buildEmbed('info', {
        title: `Ticket Closed | #${ticket.id}`,
        description: `**Opener:** <@${ticket.openerId}>\n**Closed By:** <@${closedBy.id}>\n**Category:** ${ticket.category.name}\n**Reason:** ${reason}`,
      });
      
      const payload = { embeds: [logEmbed] };
      if (transcriptFile) payload.files = [transcriptFile];
      
      await logChannel.send(payload).catch(() => {});
    }
  }

  // Try to DM opener
  try {
    const opener = await guild.client.users.fetch(ticket.openerId);
    if (opener) {
      const dmEmbed = buildEmbed('info', {
        title: `Ticket Closed in ${guild.name}`,
        description: `Your ticket **${ticket.category.name}** has been closed.\n**Reason:** ${reason}`,
      });
      const payload = { embeds: [dmEmbed] };
      if (transcriptFile) payload.files = [transcriptFile];
      
      const dmMessage = await opener.send(payload);

      // Send rating prompt
      const rateRow = new ActionRowBuilder().addComponents(
        [1, 2, 3, 4, 5].map(num => 
          new ButtonBuilder().setCustomId(`rate_${ticket.id}_${num}`).setLabel(`${num} ⭐`).setStyle(ButtonStyle.Secondary)
        )
      );
      await opener.send({ content: 'How would you rate the support you received?', components: [rateRow] });
    }
  } catch (e) {
    // Ignore DM failures
  }

  if (channel) {
    await channel.send({ embeds: [buildEmbed('warning', { description: 'This ticket will be deleted in 5 seconds.' })] });
    setTimeout(() => {
      channel.delete().catch(() => {});
    }, 5000);
  }
}

module.exports = { createTicket, closeTicket, getTicketButtons };
