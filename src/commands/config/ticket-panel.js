const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');
const { prisma } = require('../../database/client');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Manage the ticket panel')
    .addSubcommand(sub => 
      sub.setName('setup')
      .setDescription('Setup a new ticket category and post the panel')
      .addChannelOption(option => option.setName('channel').setDescription('Channel to post the panel').setRequired(true))
      .addStringOption(option => option.setName('category_name').setDescription('Name of the category').setRequired(true))
      .addRoleOption(option => option.setName('support_role').setDescription('Role that will handle these tickets').setRequired(true))
      .addStringOption(option => option.setName('emoji').setDescription('Emoji for the button').setRequired(false))
    )
    .addSubcommand(sub => 
      sub.setName('post')
      .setDescription('Post the ticket panel with all configured categories')
      .addChannelOption(option => option.setName('channel').setDescription('Channel to post the panel').setRequired(true))
    ),
  
  category: 'config',
  permissionLevel: PERMISSION_LEVELS.ADMINISTRATOR,
  
  async execute(context) {
    const subcommand = context.isInteraction ? context.source.options.getSubcommand() : context.args[0];

    if (subcommand === 'setup') {
      const channel = await context.getUser('channel', 1); // pseudo
      const targetChannel = context.isInteraction ? context.source.options.getChannel('channel') : context.channel;
      const catName = context.isInteraction ? context.source.options.getString('category_name') : context.args[2];
      const supportRole = context.isInteraction ? context.source.options.getRole('support_role') : context.guild.roles.everyone; // fallback for prefix
      const emoji = context.isInteraction ? context.source.options.getString('emoji') : null;

      if (!targetChannel || !catName || !supportRole) {
          return context.reply({ embeds: [buildEmbed('error', { description: 'Missing arguments.' })] });
      }

      await prisma.ticketCategory.create({
        data: {
          guildId: context.guild.id,
          name: catName,
          supportRoles: supportRole.id,
          emoji: emoji,
        }
      });

      await context.reply({ embeds: [buildEmbed('success', { description: `Category **${catName}** created! You can now use \`/ticket-panel post\` to update the panel.` })]});
    } else if (subcommand === 'post') {
      const targetChannel = context.isInteraction ? context.source.options.getChannel('channel') : context.channel;

      const categories = await prisma.ticketCategory.findMany({ where: { guildId: context.guild.id } });
      
      if (categories.length === 0) {
        return context.reply({ embeds: [buildEmbed('error', { description: 'No ticket categories found. Run `/ticket-panel setup` first.' })], ephemeral: true });
      }

      const embed = buildEmbed('info', {
        title: 'Support Tickets',
        description: 'Click a button below to open a ticket.',
      });

      const row = new ActionRowBuilder();
      categories.slice(0, 5).forEach(cat => {
        const btn = new ButtonBuilder()
          .setCustomId(`ticket_open_${cat.id}`)
          .setLabel(cat.name)
          .setStyle(ButtonStyle.Primary);
        
        if (cat.emoji) btn.setEmoji(cat.emoji);
        row.addComponents(btn);
      });

      await targetChannel.send({ embeds: [embed], components: [row] });
      await context.reply({ embeds: [buildEmbed('success', { description: 'Ticket panel posted!' })], ephemeral: true });
    }
  },
};
