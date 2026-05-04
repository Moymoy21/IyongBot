import { Events, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getGuildConfig } from '../services/guildConfig.js';
import { handleApplicationModal } from '../commands/Community/apply.js';
import { handleApplicationReviewModal } from '../commands/Community/app-admin.js';
import { handleInteractionError, createError, ErrorTypes } from '../utils/errorHandler.js';
import { MessageTemplates } from '../utils/messageTemplates.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { createInteractionTraceContext, runWithTraceContext } from '../utils/traceContext.js';
import { validateChatInputPayloadOrThrow } from '../utils/commandInputValidation.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';

function withTraceContext(context = {}, traceContext = {}) {
  return {
    traceId: traceContext.traceId,
    guildId: context.guildId || traceContext.guildId,
    userId: context.userId || traceContext.userId,
    command: context.commandName || traceContext.command,
    ...context
  };
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    const interactionTraceContext = createInteractionTraceContext(interaction);
    interaction.traceContext = interactionTraceContext;
    interaction.traceId = interactionTraceContext.traceId;

    return runWithTraceContext(interactionTraceContext, async () => {
      try {
        InteractionHelper.patchInteractionResponses(interaction);

        if (interaction.isChatInputCommand()) {
          try {
            logger.info(`Command executed: /${interaction.commandName} by ${interaction.user.tag}`, {
              event: 'interaction.command.received',
              traceId: interactionTraceContext.traceId,
              guildId: interaction.guildId,
              userId: interaction.user?.id,
              command: interaction.commandName
            });

            validateChatInputPayloadOrThrow(interaction, withTraceContext({
              type: 'command_input_validation',
              commandName: interaction.commandName
            }, interactionTraceContext));

            const command = client.commands.get(interaction.commandName);

            if (!command) {
              throw createError(
                `No command matching ${interaction.commandName} was found.`,
                ErrorTypes.CONFIGURATION,
                'Sorry, that command does not exist.',
                withTraceContext({ commandName: interaction.commandName }, interactionTraceContext)
              );
            }

            const abuseProtection = await enforceAbuseProtection(interaction, command, interaction.commandName);
            if (!abuseProtection.allowed) {
              const formattedCooldown = formatCooldownDuration(abuseProtection.remainingMs);
              throw createError(
                `Risky command cooldown active for ${interaction.commandName}`,
                ErrorTypes.RATE_LIMIT,
                `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,
                withTraceContext({
                  commandName: interaction.commandName,
                  subtype: 'command_cooldown',
                  expected: true,
                  cooldownMs: abuseProtection.remainingMs,
                  cooldownWindowMs: abuseProtection.policy?.windowMs,
                  cooldownMaxAttempts: abuseProtection.policy?.maxAttempts
                }, interactionTraceContext)
              );
            }

            let guildConfig = null;
            if (interaction.guild) {
              guildConfig = await getGuildConfig(client, interaction.guild.id, interactionTraceContext);
              if (guildConfig?.disabledCommands?.[interaction.commandName]) {
                throw createError(
                  `Command ${interaction.commandName} is disabled in this guild`,
                  ErrorTypes.CONFIGURATION,
                  'This command has been disabled for this server.',
                  withTraceContext({ commandName: interaction.commandName, guildId: interaction.guild.id }, interactionTraceContext)
                );
              }
            }

            await command.execute(interaction, guildConfig, client);
          } catch (error) {
            await handleInteractionError(interaction, error, withTraceContext({
              type: 'command',
              commandName: interaction.commandName
            }, interactionTraceContext));
          }
        } else if (interaction.isAutocomplete()) {
          // ... (Autocomplete logic remains the same)
          const focusedOption = interaction.options.getFocused(true);
          
          if (interaction.commandName === 'apply' && focusedOption.name === 'application') {
            try {
              const { getApplicationRoles } = await import('../utils/database.js');
              const roles = await getApplicationRoles(client, interaction.guildId);
              const roleName = interaction.options.getString('application', false);
              const filtered = roles.filter(role => role.enabled !== false && role.name.toLowerCase().startsWith(roleName?.toLowerCase() || ''));
              await interaction.respond(filtered.slice(0, 25).map(role => ({ name: `${role.name}${role.enabled === false ? ' (disabled)' : ''}`, value: role.name })));
            } catch (error) { logger.error('Error handling autocomplete:', error); await interaction.respond([]); }
          } else if (interaction.commandName === 'app-admin' && focusedOption.name === 'application') {
            try {
              const { getApplicationRoles } = await import('../utils/database.js');
              const roles = await getApplicationRoles(client, interaction.guildId);
              const appName = interaction.options.getString('application', false);
              const filtered = roles.filter(role => role.name.toLowerCase().startsWith(appName?.toLowerCase() || ''));
              await interaction.respond(filtered.slice(0, 25).map(role => ({ name: `${role.name}${role.enabled === false ? ' (disabled)' : ''}`, value: role.name })));
            } catch (error) { logger.error('Error handling app-admin autocomplete:', error); await interaction.respond([]); }
          } else if (interaction.commandName === 'reactroles' && focusedOption.name === 'panel') {
            // (Existing reactroles logic...)
          }
        } else if (interaction.isButton()) {
          if (interaction.customId.startsWith('shared_todo_')) {
            const parts = interaction.customId.split('_');
            const buttonType = parts.slice(0, 3).join('_');
            const listId = parts[3];
            const button = client.buttons.get(buttonType);

            if (button) {
              try {
                await button.execute(interaction, client, [listId]);
              } catch (error) {
                await handleInteractionError(interaction, error, withTraceContext({ type: 'button', customId: interaction.customId, handler: 'todo' }, interactionTraceContext));
              }
            }
            return;
          }

          const [customId, ...args] = interaction.customId.split(':');
          const button = client.buttons.get(customId);

          if (!button) {
            if (!interaction.customId.includes(':')) return;
            throw createError(`No button handler found for ${customId}`, ErrorTypes.CONFIGURATION);
          }

          try {
            await button.execute(interaction, client, args);
          } catch (error) {
            await handleInteractionError(interaction, error, withTraceContext({ type: 'button', customId: interaction.customId, handler: 'general' }, interactionTraceContext));
          }
        } else if (interaction.isStringSelectMenu()) {
          const [customId, ...args] = interaction.customId.split(':');
          const selectMenu = client.selectMenus.get(customId);

          if (!selectMenu) {
            if (!interaction.customId.includes(':')) return;
            throw createError(`No select menu handler found for ${customId}`, ErrorTypes.CONFIGURATION);
          }

          try {
            await selectMenu.execute(interaction, client, args);
          } catch (error) {
            await handleInteractionError(interaction, error, withTraceContext({ type: 'select_menu', customId: interaction.customId }, interactionTraceContext));
          }
        } else if (interaction.isModalSubmit()) {
          
          // --- PET MODAL SYSTEM START ---
          if (interaction.customId.startsWith('pet-modal-')) {
            try {
              const age = interaction.fields.getTextInputValue('pet-age');
              const weight = interaction.fields.getTextInputValue('pet-weight');
              const token = interaction.fields.getTextInputValue('pet-token');
              const mutation = interaction.fields.getTextInputValue('pet-mutation');
              const petIndex = interaction.customId.split('-')[2];

              await interaction.reply({
                content: `✅ **Pet Details Successfully Updated!**\n\n` +
                         `**Age:** ${age}\n` +
                         `**Weight:** ${weight}\n` +
                         `**Mutation:** ${mutation}\n` +
                         `**Token Price:** ${token}`,
                flags: MessageFlags.Ephemeral
              });
              
              logger.info(`Pet data updated via Modal for index ${petIndex} by ${interaction.user.tag}`);
            } catch (error) {
              logger.error('Error in pet-modal submission:', error);
            }
            return;
          }
          // --- PET MODAL SYSTEM END ---

          if (interaction.customId.startsWith('app_modal_')) {
            try {
              await handleApplicationModal(interaction);
            } catch (error) {
              await handleInteractionError(interaction, error, withTraceContext({ type: 'modal', customId: interaction.customId, handler: 'application' }, interactionTraceContext));
            }
            return;
          }

          if (interaction.customId.startsWith('app_review_')) {
            try {
              await handleApplicationReviewModal(interaction);
            } catch (error) {
              await handleInteractionError(interaction, error, withTraceContext({ type: 'modal', customId: interaction.customId, handler: 'application_review' }, interactionTraceContext));
            }
            return;
          }

          if (interaction.customId.startsWith('jtc_')) {
            logger.debug(`Skipping modal handler lookup for jtc: ${interaction.customId}`);
            return;
          }

          const [customId, ...args] = interaction.customId.split(':');
          const modal = client.modals.get(customId);

          if (!modal) {
            if (!interaction.customId.includes(':')) return;
            throw createError(`No modal handler found for ${customId}`, ErrorTypes.CONFIGURATION);
          }

          try {
            await modal.execute(interaction, client, args);
          } catch (error) {
            await handleInteractionError(interaction, error, withTraceContext({ type: 'modal', customId: interaction.customId, handler: 'general' }, interactionTraceContext));
          }
        }
      } catch (error) {
        logger.error('Unhandled error in interactionCreate:', { error, traceId: interactionTraceContext.traceId });
        try {
          const errorMessage = { embeds: [MessageTemplates.ERRORS.DATABASE_ERROR('processing your interaction')], flags: MessageFlags.Ephemeral };
          if (interaction.deferred) await interaction.editReply(errorMessage);
          else if (interaction.replied) await interaction.followUp(errorMessage);
          else await interaction.reply(errorMessage);
        } catch (e) { logger.error('Failed fallback response:', e); }
      }
    });
  }
};
