import { SlashCommandBuilder } from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmptyHelp, createActiveListingPage, activeListings } from '../../handlers/helpSelectMenus.js';

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("View your active pet listings"),

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction);
        
        try {
            // Check kung may laman ang listings
            const response = activeListings.length > 0 
                ? createActiveListingPage(0) 
                : createEmptyHelp();
            
            await InteractionHelper.safeEditReply(interaction, {
                embeds: response.embeds,
                components: response.components,
            });
        } catch (error) {
            console.error(error);
            await InteractionHelper.safeEditReply(interaction, { content: "Error loading listings." });
        }
    },
};
