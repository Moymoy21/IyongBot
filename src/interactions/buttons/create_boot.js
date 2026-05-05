import { createActiveListingPage, createEmptyHelp, activeListings } from '../../handlers/helpSelectMenus.js';

export default {
    name: 'createboot', 
    async execute(interaction, client) {
        try {
            // Gamitin ang tamang pangalan ng function na in-export sa helpSelectMenus.js
            const response = (activeListings && activeListings.length > 0) 
                ? createActiveListingPage(0) 
                : createEmptyHelp();
            
            await interaction.reply({
                embeds: response.embeds,
                components: response.components,
                ephemeral: true 
            });
        } catch (error) {
            console.error('[CREATEBOOT ERROR]', error);
            if (!interaction.replied) {
                await interaction.reply({ content: "May error sa pag-load ng listing menu.", ephemeral: true });
            }
        }
    },
};
