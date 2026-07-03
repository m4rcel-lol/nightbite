const { SlashCommandBuilder, AutoModerationRuleEventType, AutoModerationRuleTriggerType, AutoModerationRuleKeywordPresetType, AutoModerationActionType, PermissionFlagsBits } = require('discord.js');
const { PERMISSION_LEVELS } = require('../../utils/permissions');
const { buildEmbed } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Manage Discord AutoMod rules')
    .addSubcommand(sub => 
      sub.setName('setup')
      .setDescription('Creates basic AutoMod rules and qualifies the bot for the AutoMod badge')
    ),
  
  category: 'moderation',
  permissionLevel: PERMISSION_LEVELS.ADMINISTRATOR,
  
  async execute(context) {
    if (!context.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return context.reply({ embeds: [buildEmbed('error', { description: 'I need the **Manage Server** permission to create AutoMod rules.' })], ephemeral: true });
    }

    await context.deferReply();

    try {
      const existingRules = await context.guild.autoModerationRules.fetch();
      const hasProfanityRule = existingRules.some(rule => rule.name === 'Nightclip Basic Automod');

      if (hasProfanityRule) {
        return context.followUp({ embeds: [buildEmbed('info', { description: 'The basic AutoMod rule is already set up!' })] });
      }

      await context.guild.autoModerationRules.create({
        name: 'Nightclip Basic Automod',
        creatorId: context.client.user.id,
        enabled: true,
        eventType: AutoModerationRuleEventType.MessageSend,
        triggerType: AutoModerationRuleTriggerType.KeywordPreset,
        triggerMetadata: {
          presets: [
            AutoModerationRuleKeywordPresetType.Profanity,
            AutoModerationRuleKeywordPresetType.SexualContent,
            AutoModerationRuleKeywordPresetType.Slurs
          ]
        },
        actions: [
          {
            type: AutoModerationActionType.BlockMessage,
            metadata: {
              customMessage: 'This message was blocked by Nightclip AutoMod.'
            }
          }
        ],
        reason: 'Setting up Nightclip AutoMod to qualify for the badge'
      });

      return context.followUp({ embeds: [buildEmbed('success', { description: 'Successfully created the **Nightclip Basic Automod** rule! This blocks profanity, slurs, and sexual content.\n\n*Note: It may take up to 24 hours for Discord to grant the AutoMod badge to the bot.*' })] });
    } catch (e) {
      return context.followUp({ embeds: [buildEmbed('error', { description: `Failed to create AutoMod rule: ${e.message}` })] });
    }
  },
};
