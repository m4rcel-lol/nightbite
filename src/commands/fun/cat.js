const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Random cat image'),
  
  category: 'fun',
  permissionLevel: PERMISSION_LEVELS.EVERYONE,
  cooldown: 5,
  
  async execute(context) {
    try {
      // Free public API without auth usually
      const res = await fetch('https://api.thecatapi.com/v1/images/search');
      const data = await res.json();
      
      const embed = buildEmbed('info', {
        title: 'Meow! 🐱',
        image: data[0].url
      });
      await context.reply({ embeds: [embed] });
    } catch (e) {
      await context.reply({ embeds: [buildEmbed('error', { description: 'Failed to fetch a cat image right now.' })], ephemeral: true });
    }
  },
};
