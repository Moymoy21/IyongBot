// src/interactions/buttons/create_boot.js
import { createPetPage } from '../../handlers/helpSelectMenus.js';

export const create_boot = {
    customId: 'createboot', 
    async execute(interaction) {
        // Imbes na links lang, ipakita na natin yung magandang Pet Page Slide 1
        const { embeds, components } = createPetPage(0);
        await interaction.reply({
            embeds: embeds,
            components: components,
            ephemeral: true 
        });
    },
};
