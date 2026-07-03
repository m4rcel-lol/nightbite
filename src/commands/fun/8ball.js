const { SlashCommandBuilder } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

const answers = [
  'It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes definitely.',
  'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.',
  'Yes.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.',
  'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.',
  'Don\'t count on it.', 'My reply is no.', 'My sources say no.',
  'Outlook not so good.', 'Very doubtful.'
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8ball a question')
    .addStringOption(option => option.setName('question').setDescription('Your question').setRequired(true)),
  
  category: 'fun',
  permissionLevel: PERMISSION_LEVELS.EVERYONE,
  cooldown: 3,
  
  async execute(context) {
    const question = context.getString('question', 0, true);
    
    if (!question) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'Please ask a question.' })], ephemeral: true });
    }

    const answer = answers[Math.floor(Math.random() * answers.length)];
    const embed = buildEmbed('info', {
      title: '🎱 The Magic 8-Ball says...',
      description: `**Question:** ${question}\n**Answer:** ${answer}`
    });

    await context.reply({ embeds: [embed] });
  },
};
