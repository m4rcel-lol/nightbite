const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('httpcat')
    .setDescription('Get an HTTP cat image')
    .addIntegerOption(option => option.setName('code').setDescription('HTTP status code').setRequired(true)),
  
  category: 'fun',
  permissionLevel: PERMISSION_LEVELS.EVERYONE,
  
  async execute(context) {
    const code = context.getInteger('code', 0);
    if (!code || code < 100 || code > 599) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please provide a valid HTTP status code.' })], ephemeral: true });
    }

    const embed = buildEmbed('info', {
      title: `HTTP ${code}`,
      image: `https://http.cat/${code}.jpg`
    });

    await context.reply({ embeds: [embed] });
  },
};
