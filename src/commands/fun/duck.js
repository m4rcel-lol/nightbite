const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duck')
    .setDescription('Random duck image'),
  
  category: 'fun',
  permissionLevel: PERMISSION_LEVELS.EVERYONE,
  cooldown: 5,
  
  async execute(context) {
    try {
      const res = await fetch('https://random-d.uk/api/v2/random');
      const data = await res.json();
      
      const embed = buildEmbed('info', {
        title: 'Quack! 🦆',
        image: data.url
      });
      await context.reply({ embeds: [embed] });
    } catch (e) {
      await context.reply({ embeds: [buildEmbed('error', { description: 'Failed to fetch a duck image right now.' })], ephemeral: true });
    }
  },
};
