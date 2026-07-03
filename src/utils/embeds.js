const { EmbedBuilder } = require('discord.js');

const { colors } = require('./constants');

function buildEmbed(type = 'default', options = {}) {
  const {
    title = '',
    description = '',
    color = colors.brandColor,
    footer = null,
    timestamp = true,
    thumbnail = null,
    image = null,
    author = null,
  } = options;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description);

  if (timestamp) embed.setTimestamp();
  if (footer) embed.setFooter({ text: footer });
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (author) embed.setAuthor(author);

  switch (type) {
    case 'success':
      embed.setTitle(`✅ ${title || 'Success'}`);
      embed.setColor(colors.successColor);
      break;
    case 'error':
      embed.setTitle(`❌ ${title || 'Error'}`);
      embed.setColor(colors.errorColor);
      break;
    case 'warning':
      embed.setTitle(`⚠️ ${title || 'Warning'}`);
      embed.setColor(colors.warningColor);
      break;
    case 'info':
      embed.setTitle(`ℹ️ ${title || 'Information'}`);
      embed.setColor(colors.brandColor);
      break;
  }

  return embed;
}

module.exports = { buildEmbed };