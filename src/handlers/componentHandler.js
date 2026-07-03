const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { createTicket, closeTicket, getTicketButtons } = require('../utils/ticketManager');
const { prisma } = require('../database/client');
const { buildEmbed } = require('../utils/embeds');
const { PERMISSION_LEVELS, getPermissionLevel } = require('../utils/permissions');

module.exports = async (interaction, client) => {
  if (interaction.isButton()) {
    // Ticket Panel Open
    if (interaction.customId.startsWith('ticket_open_')) {
      const categoryId = interaction.customId.replace('ticket_open_', '');
      const category = await prisma.ticketCategory.findUnique({ where: { id: parseInt(categoryId) } });
      
      if (!category) return interaction.reply({ content: 'This category no longer exists.', ephemeral: true });

      // Check limits before opening modal
      const guildConfig = await prisma.guild.findUnique({ where: { id: interaction.guild.id } });
      const openCount = await prisma.ticket.count({ where: { guildId: interaction.guild.id, openerId: interaction.user.id, status: 'open' } });
      
      if (guildConfig && openCount >= guildConfig.ticketMaxOpen) {
        return interaction.reply({ embeds: [buildEmbed('error', { description: `You can only have ${guildConfig.ticketMaxOpen} open tickets at a time.` })], ephemeral: true });
      }

      // Check if intake questions exist
      if (category.intakeQuestions) {
        const questions = JSON.parse(category.intakeQuestions);
        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${category.id}`)
          .setTitle(`Open ${category.name} Ticket`);
        
        questions.forEach((q, i) => {
          modal.addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId(`q_${i}`)
                .setLabel(q.substring(0, 45))
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );
        });
        return interaction.showModal(modal);
      } else {
        await interaction.deferReply({ ephemeral: true });
        try {
          const { channel } = await createTicket(interaction.guild, interaction.user, category.id);
          return interaction.followUp({ embeds: [buildEmbed('success', { description: `Ticket created: <#${channel.id}>` })], ephemeral: true });
        } catch (e) {
          return interaction.followUp({ embeds: [buildEmbed('error', { description: e.message })], ephemeral: true });
        }
      }
    }

    // Ticket Actions
    if (interaction.customId.startsWith('ticket_')) {
      const parts = interaction.customId.split('_');
      const action = parts[1]; // close, claim, members, priority
      const ticketId = parseInt(parts[2]);

      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.status === 'closed') {
        return interaction.reply({ content: 'Ticket not found or already closed.', ephemeral: true });
      }

      // Check staff perms for ticket actions (except opener can close)
      const userLevel = await getPermissionLevel(interaction.member, 'tickets');
      const isStaff = userLevel >= PERMISSION_LEVELS.STAFF_TICKETS;
      const isOpener = ticket.openerId === interaction.user.id;

      if (!isStaff && !isOpener) {
        return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
      }

      if (action === 'close') {
        return interaction.reply({
          embeds: [buildEmbed('warning', { description: 'Are you sure you want to close this ticket?' })],
          components: [
            new ActionRowBuilder().addComponents(
              new ActionRowBuilder().components = [
                new ButtonBuilder().setCustomId(`confirm_close_${ticket.id}`).setLabel('Confirm Close').setStyle(ButtonStyle.Danger)
              ]
            )
          ]
        });
      }

      if (action === 'claim') {
        if (!isStaff) return interaction.reply({ content: 'Only staff can claim tickets.', ephemeral: true });
        
        if (ticket.claimedBy) {
          // Unclaim
          if (ticket.claimedBy !== interaction.user.id && userLevel < PERMISSION_LEVELS.ADMINISTRATOR) {
             return interaction.reply({ content: 'You cannot unclaim someone else\'s ticket.', ephemeral: true });
          }
          await prisma.ticket.update({ where: { id: ticket.id }, data: { claimedBy: null } });
          const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
          await interaction.message.edit({ components: [getTicketButtons(updatedTicket)] });
          return interaction.reply({ content: 'Ticket unclaimed.', ephemeral: false });
        } else {
          // Claim
          await prisma.ticket.update({ where: { id: ticket.id }, data: { claimedBy: interaction.user.id } });
          const updatedTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
          await interaction.message.edit({ components: [getTicketButtons(updatedTicket)] });
          return interaction.reply({ content: `Ticket claimed by <@${interaction.user.id}>.`, ephemeral: false });
        }
      }

      // Member and Priority could open a small modal or select menu. (Skipping full implementation for brevity here, can be added later)
      if (action === 'members' || action === 'priority') {
        return interaction.reply({ content: 'Please use the slash commands `/ticket add` or `/ticket priority` for this.', ephemeral: true });
      }
    }

    if (interaction.customId.startsWith('confirm_close_')) {
      const ticketId = parseInt(interaction.customId.replace('confirm_close_', ''));
      await interaction.reply({ content: 'Closing ticket...', ephemeral: false });
      await closeTicket(ticketId, interaction.member, 'Closed via button');
    }

    if (interaction.customId.startsWith('rate_')) {
      const parts = interaction.customId.split('_');
      const ticketId = parseInt(parts[1]);
      const rating = parseInt(parts[2]);

      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (ticket && ticket.claimedBy) {
        await prisma.ticketRating.create({
          data: {
            ticketId,
            staffId: ticket.claimedBy,
            rating,
          }
        });
        await interaction.update({ content: `Thank you for your rating (${rating} ⭐)!`, components: [] });
      } else {
        await interaction.update({ content: 'Rating submitted (unclaimed ticket).', components: [] });
      }
    }

    if (interaction.customId.startsWith('approve_ban_') || interaction.customId.startsWith('deny_ban_')) {
      const isApprove = interaction.customId.startsWith('approve_ban_');
      const banId = parseInt(interaction.customId.replace(isApprove ? 'approve_ban_' : 'deny_ban_', ''));

      const pendingBan = await prisma.pendingBan.findUnique({ where: { id: banId } });
      if (!pendingBan) {
        return interaction.update({ embeds: [buildEmbed('error', { description: 'This ban request is no longer valid or has already been processed.' })], components: [] });
      }

      const guild = client.guilds.cache.get(pendingBan.guildId);
      if (!guild) return interaction.update({ content: 'Guild not found.', components: [] });

      if (interaction.user.id !== guild.ownerId) {
        return interaction.reply({ content: 'Only the server owner can approve this.', ephemeral: true });
      }

      await interaction.deferUpdate();

      if (isApprove) {
        try {
          const targetUser = await client.users.fetch(pendingBan.targetId);
          await guild.members.ban(pendingBan.targetId, {
            reason: `[Approved by Owner] ${pendingBan.reason}`,
            deleteMessageSeconds: pendingBan.deleteDays * 86400,
          });

          // Log the case
          const { createCase } = require('../utils/modLog');
          await createCase({
            guild,
            user: targetUser,
            moderator: await client.users.fetch(pendingBan.moderatorId),
            action: 'ban',
            reason: `[Approved by Owner] ${pendingBan.reason}`,
          });

          await interaction.editReply({
            embeds: [buildEmbed('success', { description: `✅ You approved the ban for <@${pendingBan.targetId}>.` })],
            components: []
          });
        } catch (e) {
          await interaction.editReply({
            embeds: [buildEmbed('error', { description: `Failed to execute ban: ${e.message}` })],
            components: []
          });
        }
      } else {
        await interaction.editReply({
          embeds: [buildEmbed('info', { description: `❌ You denied the ban for <@${pendingBan.targetId}>.` })],
          components: []
        });
      }

      // Cleanup
      await prisma.pendingBan.delete({ where: { id: pendingBan.id } });
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('ticket_modal_')) {
      const categoryId = parseInt(interaction.customId.replace('ticket_modal_', ''));
      const category = await prisma.ticketCategory.findUnique({ where: { id: categoryId } });
      
      if (!category) return interaction.reply({ content: 'Error: Category not found.', ephemeral: true });
      
      const questions = JSON.parse(category.intakeQuestions || '[]');
      const intakeAnswers = questions.map((q, i) => ({
        question: q,
        answer: interaction.fields.getTextInputValue(`q_${i}`)
      }));

      await interaction.deferReply({ ephemeral: true });
      try {
        const { channel } = await createTicket(interaction.guild, interaction.user, category.id, intakeAnswers);
        return interaction.followUp({ embeds: [buildEmbed('success', { description: `Ticket created: <#${channel.id}>` })], ephemeral: true });
      } catch (e) {
        return interaction.followUp({ embeds: [buildEmbed('error', { description: e.message })], ephemeral: true });
      }
    }
  }
};
