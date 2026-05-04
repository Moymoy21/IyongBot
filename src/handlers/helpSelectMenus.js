import { createEmbed } from '../utils/embeds.js';
import { createButton } from '../utils/components.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const FOOTER_TEXT = "Made with Iyong Official";

const PET_IMAGES = [
    { name: "Dilophosaurus", url: "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png/revision/latest?cb=20250712071322" },
    { name: "Peryton", url: "https://static.wikia.nocookie.net/growagarden/images/2/26/PerytonPet.png/revision/latest?cb=20260416073019" },
    { name: "Kitsune", url: "https://static.wikia.nocookie.net/growagarden/images/0/04/Kitsune.png/revision/latest?cb=20250918145223" }
];

export function createPetPage(index) {
    const pet = PET_IMAGES[index];
    const embed = createEmbed({ title: `🐾 ${pet.name}`, color: 'primary' });
    embed.setImage(pet.url);
    embed.setFooter({ text: `${FOOTER_TEXT} | Pet ${index + 1} of ${PET_IMAGES.length}` });

    const row = new ActionRowBuilder().addComponents(
        createButton(`pet_prev_${index}`, "Prev", "secondary", "⬅️", index === 0),
        createButton(`pet_next_${index}`, "Next", "secondary", "➡️", index === PET_IMAGES.length - 1),
        createButton(`pet_listing_${index}`, "Create Listing", "success", "🛍️", false),
        createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false)
    );
    return { embeds: [embed], components: [row] };
}

// Handler para sa lahat ng help-related interactions
export const helpCategorySelectMenu = {
    name: "help-category-select", // Siguraduhin na ito ang customId ng Select Menu mo
    async execute(interaction, client) {
        try {
            const customId = interaction.customId;
            
            // --- 1. MODAL CHECK ---
            if (customId.startsWith('pet_listing_')) {
                const index = parseInt(customId.split('_')[2]);
                const modal = new ModalBuilder()
                    .setCustomId(`listing_modal_${index}`)
                    .setTitle(`Listing: ${PET_IMAGES[index].name}`);

                const row1 = new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('price').setLabel("Price").setStyle(TextInputStyle.Short).setRequired(true)
                );
                const row2 = new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('desc').setLabel("Description").setStyle(TextInputStyle.Paragraph).setRequired(true)
                );

                modal.addComponents(row1, row2);
                return await interaction.showModal(modal);
            }

            // --- 2. DEFER UPDATE (Para sa buttons at menu) ---
            if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

            // --- 3. SELECT MENU LOGIC ---
            if (interaction.isStringSelectMenu()) {
                const value = interaction.values[0];
                if (value === 'createboot') {
                    const result = createPetPage(0);
                    return await interaction.editReply(result);
                }
                // Dito mo ilalagay yung ibang categories (Economy, etc.)
                return await interaction.editReply({ content: `Category selected: ${value}` });
            }

            // --- 4. BUTTON LOGIC ---
            if (interaction.isButton()) {
                if (customId.startsWith('pet_prev_') || customId.startsWith('pet_next_')) {
                    const parts = customId.split('_');
                    let index = parseInt(parts[2]);
                    if (parts[1] === 'next') index++;
                    if (parts[1] === 'prev') index--;
                    
                    const result = createPetPage(index);
                    return await interaction.editReply(result);
                }

                if (customId === BACK_BUTTON_ID) {
                    // Dahil binura natin ang helpButtons.js, kailangan nating i-trigger ang main help menu dito
                    return await interaction.editReply({ content: "Please use `/help` to go back. (Menu reset)" });
                }
            }
        } catch (error) {
            console.error('[CRITICAL HELP ERROR]', error);
        }
    }
};
