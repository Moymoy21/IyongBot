import { createPetPage } from '../../handlers/helpSelectMenus.js';

export default {
    name: 'createboot', 
    async execute(interaction, client) {
        try {
            // Dahil ito ay listing logic, ipakita ang current listings
            const response = createPetPage(0);
            
            await interaction.reply({
                embeds: response.embeds,
                components: response.components,
                ephemeral: true 
            });
        } catch (error) {
            console.error('[CREATEBOOT ERROR]', error);
        }
    },
};
