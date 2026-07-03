const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Tells a random joke'),
  
  category: 'fun',
  permissionLevel: PERMISSION_LEVELS.EVERYONE,
  cooldown: 5,
  
  async execute(context) {
    try {
      const res = await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode');
      const data = await res.json();
      
      let text = '';
      if (data.type === 'single') {
        text = data.joke;
      } else {
        text = `${data.setup}\n\n*${data.delivery}*`;
      }

      const embed = buildEmbed('info', {
        title: 'Here\'s a joke! 🤡',
        description: text
      });
      await context.reply({ embeds: [embed] });
    } catch (e) {
      await context.reply({ embeds: [buildEmbed('error', { description: 'Failed to fetch a joke right now.' })], ephemeral: true });
    }
  },
};
