import { SlashCommandBuilder } from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmptyHelp, createActiveListingPage, activeListings } from '../../handlers/helpSelectMenus.js';

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("View your active pet listings"),

    async execute(interaction, guildConfig, client) {
        try {
            await InteractionHelper.safeDefer(interaction);
            const response = (activeListings && activeListings.length > 0) 
                ? createActiveListingPage(0) 
                : createEmptyHelp();
            await InteractionHelper.safeEditReply(interaction, response);
        } catch (error) {
            console.error(error);
        }
    },
};
