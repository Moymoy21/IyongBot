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
const ALL_COMMANDS_ID = "help-all-commands";
const FOOTER_TEXT = "Made with Iyong Official";

const PET_IMAGES = [
    { name: "Dilophosaurus", url: "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png/revision/latest?cb=20250712071322" },
    { name: "Peryton", url: "https://static.wikia.nocookie.net/growagarden/images/2/26/PerytonPet.png/revision/latest?cb=20260416073019" },
    { name: "Kitsune", url: "https://static.wikia.nocookie.net/growagarden/images/0/04/Kitsune.png/revision/latest?cb=20250918145223" }
];

export async function createAllCommandsMenu(page = 1, client) {
    const embed = createEmbed({ title: "📋 All Commands", description: "Listing all commands...", color: 'primary' });
    const row = new ActionRowBuilder().addComponents(createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false));
    return { embeds: [embed], components: [row] };
}

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

export const helpCategorySelectMenu = {
    name: "help-category-select",
    async execute(interaction, client) {
        try {
            const customId = interaction.customId;
            console.log(`[INTERACTION DEBUG] ID Clicked: ${customId}`); // TINGNAN ITO SA RAILWAY LOGS

            // 1. MODAL (Create Listing)
            if (customId.startsWith('pet_listing_')) {
                const index = parseInt(customId.split('_')[2]);
                const modal = new ModalBuilder()
                    .setCustomId(`listing_modal_${index}`)
                    .setTitle(`Listing: ${PET_IMAGES[index].name}`);

                const fields = [
                    new TextInputBuilder().setCustomId('price').setLabel("Price").setStyle(TextInputStyle.Short).setRequired(true),
                    new TextInputBuilder().setCustomId('desc').setLabel("Description").setStyle(TextInputStyle.Paragraph).setRequired(true)
                ];

                modal.addComponents(fields.map(f => new ActionRowBuilder().addComponents(f)));
                return await interaction.showModal(modal);
            }

            // 2. LAHAT NG MAY DEFER
            if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

            if (interaction.isStringSelectMenu()) {
                if (interaction.values[0] === 'createboot') {
                    const result = createPetPage(0);
                    return await interaction.editReply({ embeds: result.embeds, components: result.components });
                }
                // ... ibang menu logic dito (Economy, etc.)
            }

            if (interaction.isButton()) {
                // NAVIGATION
                if (customId.startsWith('pet_prev_') || customId.startsWith('pet_next_')) {
                    const parts = customId.split('_');
                    let index = parseInt(parts[2]);
                    if (parts[1] === 'next') index++;
                    if (parts[1] === 'prev') index--;
                    
                    const result = createPetPage(index);
                    return await interaction.editReply({ embeds: result.embeds, components: result.components });
                }

                // BACK
                if (customId === BACK_BUTTON_ID) {
                    return await interaction.editReply({ content: "Paki-type ulit ang `/help`." });
                }
            }
        } catch (error) {
            console.error('[HANDLER ERROR]', error);
        }
    },
};
