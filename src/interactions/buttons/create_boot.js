import { createPetPage } from '../../handlers/helpSelectMenus.js';

export const createBoot = {
    name: 'createboot', // Gamitin ang 'name' imbes na 'customId' para sa loader mo
    async execute(interaction, client) {
        try {
            // Ipakita ang unang page (index 0)
            const response = createPetPage(0);
            
            await interaction.reply({
                embeds: response.embeds,
                components: response.components,
                ephemeral: true 
            });
        } catch (error) {
            console.error('[BUTTON ERROR]', error);
            if (!interaction.replied) {
                await interaction.reply({ content: "Error loading create boot menu.", ephemeral: true });
            }
        }
    },
};

export default createBoot;
