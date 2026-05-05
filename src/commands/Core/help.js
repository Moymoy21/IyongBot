import { SlashCommandBuilder } from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
// Siguraduhin na ang path na ito ay tama base sa folder structure mo:
import { createEmptyHelp, createActiveListingPage, activeListings } from '../../handlers/helpSelectMenus.js';

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("View your active pet listings"),

    async execute(interaction, guildConfig, client) {
        // Mahalaga ang try-catch para hindi mag-crash ang buong command loader
        try {
            await InteractionHelper.safeDefer(interaction);
            
            const response = (activeListings && activeListings.length > 0)
                ? createActiveListingPage(0) 
                : createEmptyHelp();
            
            await InteractionHelper.safeEditReply(interaction, {
                embeds: response.embeds,
                components: response.components,
            });
        } catch (error) {
            console.error("HELP COMMAND ERROR:", error);
            // Pag may error, mag-reply pa rin para hindi "Interaction Failed"
            if (interaction.deferred) {
                await interaction.editReply({ content: "Nagkaroon ng error sa pag-load ng help menu." });
            }
        }
    },
};
