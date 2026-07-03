const { EmbedBuilder } = require('discord.js');
const { COLORS, EMOJIS, BOT_NAME } = require('../config/constants');

/**
 * Build a standard formatted embed
 * @param {'info' | 'success' | 'error' | 'warning'} type
 * @param {Object} options
 * @param {string} [options.title]
 * @param {string} options.description
 * @param {import('discord.js').User | import('discord.js').ClientUser} [options.clientUser] Pass client.user to set the footer icon
 * @param {import('discord.js').APIEmbedField[]} [options.fields]
 * @param {string} [options.image]
 * @returns {EmbedBuilder}
 */
function buildEmbed(type, { title, description, clientUser, fields = [], image } = {}) {
  const embed = new EmbedBuilder();

  let color = COLORS.PRIMARY;
  let prefix = '';

  switch (type) {
    case 'success':
      color = COLORS.SUCCESS;
      prefix = `${EMOJIS.SUCCESS} `;
      break;
    case 'error':
      color = COLORS.ERROR;
      prefix = `${EMOJIS.ERROR} `;
      break;
    case 'warning':
      color = COLORS.WARNING;
      prefix = `${EMOJIS.WARNING} `;
      break;
    case 'info':
    default:
      color = COLORS.PRIMARY;
      break;
  }

  embed.setColor(color);

  if (title) {
    embed.setTitle(title);
    embed.setDescription(`${prefix}${description}`);
  } else {
    embed.setDescription(`${prefix}${description}`);
  }

  if (fields.length > 0) {
    embed.addFields(fields);
  }

  if (image) {
    embed.setImage(image);
  }

  embed.setTimestamp();

  if (clientUser) {
    embed.setFooter({ text: BOT_NAME, iconURL: clientUser.displayAvatarURL() });
  } else {
    embed.setFooter({ text: BOT_NAME });
  }

  return embed;
}

module.exports = { buildEmbed };
