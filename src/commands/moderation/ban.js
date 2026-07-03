const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PERMISSION_LEVELS, canModerate, getPermissionLevel } = require('../../utils/permissions');
const { createCase } = require('../../utils/modLog');
const { buildEmbed } = require('../../utils/embeds');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to ban').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('Reason for the ban').setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('delete_messages_days')
        .setDescription('Days of messages to delete')
        .setMinValue(0)
        .setMaxValue(7)
    )
    .addBooleanOption((option) =>
      option
        .setName('punish_staff')
        .setDescription('Required to request banning a staff member')
        .setRequired(false)
    ),

  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',

  async execute(context) {
    const targetUser = await context.getUser('user', 0);
    const reason = context.getString('reason', 1, true) || 'No reason provided';
    const deleteDays = context.getInteger('delete_messages_days', 2) || 0;
    
    // For prefix commands, we'll try to parse the last argument if it's "true" or "false"
    let punishStaff = false;
    if (context.isInteraction) {
      punishStaff = context.source.options.getBoolean('punish_staff') || false;
    } else {
      const lastArg = context.args[context.args.length - 1];
      if (lastArg === 'true' || lastArg === '--punish_staff') {
        punishStaff = true;
      }
    }

    if (!targetUser) {
      return context.reply({
        embeds: [buildEmbed('error', { description: 'Please specify a valid user to ban.' })],
        ephemeral: true,
      });
    }

    const targetMember = await context.guild.members.fetch(targetUser.id).catch((e) => {
      if (e.code !== 10007) throw e;
      return null;
    });

    if (targetMember) {
      if (!canModerate(context.member, targetMember)) {
        return context.reply({
          embeds: [
            buildEmbed('error', {
              description: 'You cannot ban a user with an equal or higher role.',
            }),
          ],
          ephemeral: true,
        });
      }

      const targetLevel = await getPermissionLevel(targetMember, 'all');
      const isStaff = targetLevel >= PERMISSION_LEVELS.STAFF_MODERATION;

      if (isStaff) {
        if (!punishStaff) {
          return context.reply({
            embeds: [
              buildEmbed('error', {
                description: 'Target is a staff member. You must provide the `punish_staff` argument to request a ban.',
              }),
            ],
            ephemeral: true,
          });
        }

        const isOwner = context.member.id === context.guild.ownerId;
        
        if (!isOwner) {
          // It's a staff ban requested by a non-owner. Needs approval.
          const pendingBan = await prisma.pendingBan.create({
            data: {
              guildId: context.guild.id,
              targetId: targetUser.id,
              moderatorId: context.user.id,
              reason: reason,
              deleteDays: deleteDays
            }
          });

          try {
            const owner = await context.guild.fetchOwner();
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`approve_ban_${pendingBan.id}`)
                .setLabel('Approve Ban')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId(`deny_ban_${pendingBan.id}`)
                .setLabel('Deny Ban')
                .setStyle(ButtonStyle.Secondary)
            );

            await owner.send({
              embeds: [
                buildEmbed('warning', {
                  title: 'Pending Staff Ban Approval',
                  description: `**Moderator:** <@${context.user.id}>\n**Target Staff:** <@${targetUser.id}>\n**Reason:** ${reason}\n\nDo you want to approve this ban?`
                })
              ],
              components: [row]
            });

            return context.reply({
              embeds: [buildEmbed('success', { description: `Sent an approval request to the Server Owner to ban the staff member **${targetUser.tag}**.` })]
            });
          } catch (err) {
            return context.reply({
              embeds: [buildEmbed('error', { description: `Failed to DM the server owner for approval. Ensure their DMs are open.` })],
              ephemeral: true
            });
          }
        }
      }

      if (!targetMember.bannable) {
        return context.reply({
          embeds: [
            buildEmbed('error', {
              description:
                'I do not have permission to ban this user. Make sure my role is higher than theirs.',
            }),
          ],
          ephemeral: true,
        });
      }

      // Try DMing before ban
      try {
        const dmEmbed = buildEmbed('error', {
          title: `You have been banned from ${context.guild.name}`,
          description: `**Reason:** ${reason}`,
        });
        await targetUser.send({ embeds: [dmEmbed] });
      } catch (e) {
        // Ignore DM failures
      }
    }

    try {
      await context.guild.members.ban(targetUser.id, {
        reason,
        deleteMessageSeconds: deleteDays * 86400,
      });
      await createCase({
        guild: context.guild,
        user: targetUser,
        moderator: context.user,
        action: 'ban',
        reason,
      });

      const successEmbed = buildEmbed('success', {
        description: `Banned **${targetUser.tag}**. \n**Reason:** ${reason}`,
      });
      await context.reply({ embeds: [successEmbed] });
    } catch (error) {
      const errorEmbed = buildEmbed('error', {
        description: `Failed to ban user: ${error.message}`,
      });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
