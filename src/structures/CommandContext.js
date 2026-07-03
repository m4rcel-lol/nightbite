/**
 * Represents the normalized context for executing a command
 * Works across both Prefix Messages and Slash Command Interactions
 */
class CommandContext {
  /**
   * @param {import('discord.js').Message | import('discord.js').ChatInputCommandInteraction} interactionOrMessage
   * @param {string[]} args Only populated if it's a message
   */
  constructor(interactionOrMessage, args = []) {
    this.source = interactionOrMessage;
    this.isInteraction = interactionOrMessage.isCommand !== undefined;
    this.args = args;
  }

  get client() {
    return this.source.client;
  }

  get guild() {
    return this.source.guild;
  }

  get channel() {
    return this.source.channel;
  }

  get member() {
    return this.source.member;
  }

  get user() {
    return this.isInteraction ? this.source.user : this.source.author;
  }

  /**
   * Replies to the context
   * @param {string|import('discord.js').MessagePayload|import('discord.js').InteractionReplyOptions} options
   */
  async reply(options) {
    if (this.isInteraction) {
      if (this.source.deferred || this.source.replied) {
        return this.source.editReply(options);
      }
      return this.source.reply(options);
    } else {
      return this.source.reply(options);
    }
  }

  /**
   * Defer reply (useful for long tasks)
   * @param {boolean} ephemeral
   */
  async deferReply({ ephemeral = false } = {}) {
    if (this.isInteraction) {
      return this.source.deferReply({ ephemeral });
    }
    // Prefix commands don't technically defer, but we could send a loading state if needed.
    // For now, no-op for prefix.
  }

  /**
   * Helper to safely extract a user argument
   * @param {string} optionName For slash commands
   * @param {number} argIndex For prefix commands
   * @returns {Promise<import('discord.js').User|null>}
   */
  async getUser(optionName, argIndex) {
    if (this.isInteraction) {
      return this.source.options.getUser(optionName);
    } else {
      const arg = this.args[argIndex];
      if (!arg) return null;
      const match = arg.match(/<@!?(\d+)>/);
      const id = match ? match[1] : arg;
      try {
        return await this.client.users.fetch(id);
      } catch {
        return null;
      }
    }
  }

  /**
   * Helper to cleanly get a string argument, handling multi-word for prefix
   */
  getString(optionName, argIndex, consumeRest = false) {
    if (this.isInteraction) {
      return this.source.options.getString(optionName);
    } else {
      if (consumeRest) {
        return this.args.slice(argIndex).join(' ') || null;
      }
      return this.args[argIndex] || null;
    }
  }

  getInteger(optionName, argIndex) {
    if (this.isInteraction) {
      return this.source.options.getInteger(optionName);
    } else {
      const val = parseInt(this.args[argIndex], 10);
      return isNaN(val) ? null : val;
    }
  }
}

module.exports = { CommandContext };
