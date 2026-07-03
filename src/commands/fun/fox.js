const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fox')
    .setDescription('Random fox image'),
  
  category: 'fun',
  permissionLevel: PERMISSION_LEVELS.EVERYONE,
  cooldown: 5,
  
  async execute(context) {
    try {
      const res = await fetch('https://randomfox.ca/floof/');
      const data = await res.json();
      
      const embed = buildEmbed('info', {
        title: 'What does the fox say? 🦊',
        image: data.image
      });
      await context.reply({ embeds: [embed] });
    } catch (e) {
      await context.reply({ embeds: [buildEmbed('error', { description: 'Failed to fetch a fox image right now.' })], ephemeral: true });
    }
  },
};
