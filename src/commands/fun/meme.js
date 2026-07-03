const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme'),
  
  category: 'fun',
  permissionLevel: PERMISSION_LEVELS.EVERYONE,
  cooldown: 5,
  
  async execute(context) {
    try {
      const res = await fetch('https://meme-api.com/gimme');
      const data = await res.json();
      
      const embed = buildEmbed('info', {
        title: data.title,
        description: `Source: r/${data.subreddit}`,
        image: data.url
      });
      await context.reply({ embeds: [embed] });
    } catch (e) {
      await context.reply({ embeds: [buildEmbed('error', { description: 'Failed to fetch a meme right now.' })], ephemeral: true });
    }
  },
};
