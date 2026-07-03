const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete up to 100 recent messages')
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to delete (1-100)').setMinValue(1).setMaxValue(100).setRequired(true))
    .addUserOption(option => option.setName('user').setDescription('Filter by user'))
    .addStringOption(option => option.setName('contains').setDescription('Filter by text content')),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.STAFF_MODERATION,
  requiredScope: 'moderation',
  
  async execute(context) {
    const amount = context.getInteger('amount', 0);
    const targetUser = await context.getUser('user', 1);
    // 2 is theoretically user, so we check string safely.
    // In slash it's 'contains', in prefix we might not support these filters perfectly if they mix up order.
    // Let's keep it simple for prefix and assume slash is primary for filters.
    const containsText = context.isInteraction ? context.getString('contains') : null;

    if (!amount || amount < 1 || amount > 100) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please provide a valid amount between 1 and 100.' })], ephemeral: true });
    }

    try {
      await context.deferReply({ ephemeral: true });
      
      const messages = await context.channel.messages.fetch({ limit: amount });
      let messagesToDelete = messages;

      if (targetUser) {
        messagesToDelete = messagesToDelete.filter(m => m.author.id === targetUser.id);
      }
      if (containsText) {
        messagesToDelete = messagesToDelete.filter(m => m.content.toLowerCase().includes(containsText.toLowerCase()));
      }

      if (messagesToDelete.size === 0) {
        return context.reply({ embeds: [buildEmbed('info', { description: 'No messages matched the criteria to delete.' })] });
      }

      const deleted = await context.channel.bulkDelete(messagesToDelete, true);
      
      const successEmbed = buildEmbed('success', { description: `Successfully deleted ${deleted.size} messages.` });
      
      if (context.isInteraction) {
        await context.reply({ embeds: [successEmbed] });
      } else {
        const msg = await context.reply({ embeds: [successEmbed] });
        setTimeout(() => msg.delete().catch(() => {}), 3000);
      }
    } catch (error) {
      const errorEmbed = buildEmbed('error', { description: `Failed to purge messages: ${error.message}` });
      await context.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
