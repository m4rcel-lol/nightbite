const { Collection } = require('discord.js');

// Collection<commandName, Collection<userId, timestamp>>
const cooldowns = new Collection();

/**
 * Check if a user is on cooldown for a specific command
 * @param {string} commandName
 * @param {string} userId
 * @param {number} cooldownSeconds
 * @returns {number|null} Returns seconds left if on cooldown, else null
 */
function checkCooldown(commandName, userId, cooldownSeconds) {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Collection());
  }

  const timestamps = cooldowns.get(commandName);
  const cooldownAmount = (cooldownSeconds || 3) * 1000;
  const now = Date.now();

  if (timestamps.has(userId)) {
    const expirationTime = timestamps.get(userId) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return timeLeft;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  return null;
}

module.exports = { checkCooldown };
