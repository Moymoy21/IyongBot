import { SlashCommandBuilder } from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createPetPage } from '../../handlers/helpSelectMenus.js'; // Import natin ang pet page logic

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Manage and view your pet listings"),

    async execute(interaction, guildConfig, client) {
        // Gamitin ang safeDefer para hindi mag-timeout habang naglo-load
        await InteractionHelper.safeDefer(interaction);
        
        try {
            // Dito natin tatawagin ang createPetPage(0) para Dilophosaurus (Page 1) agad ang lumabas
            const { embeds, components } = createPetPage(0);
            
            await InteractionHelper.safeEditReply(interaction, {
                embeds,
                components,
            });
        } catch (error) {
            console.error("Help Command Error:", error);
            await InteractionHelper.safeEditReply(interaction, {
                content: "Error loading listings. Make sure helpSelectMenus.js is updated.",
                embeds: [],
                components: []
            });
        }
    },
};
