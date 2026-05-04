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

// --- HINAHANAP NA EXPORT PARA SA IBANG HANDLERS ---
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
        // SIGURADONG MAY LABEL PARA HINDI MAG-ERROR NA "NON-EMPTY STRING"
        createButton(`pet-prev-${index}`, "Prev", "secondary", "⬅️", index === 0),
        createButton(`pet-next-${index}`, "Next", "secondary", "➡️", index === PET_IMAGES.length - 1),
        createButton(`pet-listing-${index}`, "Create Listing", "success", "🛍️", false),
        createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false)
    );
    return { embeds: [embed], components: [row] };
}

export const helpCategorySelectMenu = {
    name: "help-category-select",
    async execute(interaction, client) {
        try {
            const customId = interaction.customId;

            // 1. MODAL (CREATE LISTING) - DAPAT MAUNA ITO. Bawal mag-deferUpdate bago mag-showModal.
            if (interaction.isButton() && customId.startsWith('pet-listing-')) {
                const index = parseInt(customId.split('-')[2]);
                const modal = new ModalBuilder()
                    .setCustomId(`listing-modal-${index}`)
                    .setTitle(`Listing: ${PET_IMAGES[index].name}`);

                const fields = [
                    new TextInputBuilder().setCustomId('price').setLabel("Price").setStyle(TextInputStyle.Short).setPlaceholder("e.g. 500").setRequired(true),
                    new TextInputBuilder().setCustomId('desc').setLabel("Description").setStyle(TextInputStyle.Paragraph).setPlaceholder("Pet details...").setRequired(true)
                ];

                modal.addComponents(fields.map(f => new ActionRowBuilder().addComponents(f)));
                return await interaction.showModal(modal);
            }

            // 2. PARA SA IBANG INTERACTIONS - MAG-DEFER UPDATE NA
            if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

            // HANDLING NEXT / PREV
            if (interaction.isButton() && (customId.startsWith('pet-prev-') || customId.startsWith('pet-next-'))) {
                const parts = customId.split('-');
                let index = parseInt(parts[2]);
                if (parts[1] === 'next') index++;
                if (parts[1] === 'prev') index--;
                
                const result = createPetPage(index);
                return await interaction.editReply({ embeds: result.embeds, components: result.components });
            }

            // BACK TO MAIN
            if (interaction.isButton() && customId === BACK_BUTTON_ID) {
                return await interaction.editReply({ content: "Paki-type ulit ang `/help` para bumalik sa main menu." });
            }

        } catch (error) {
            console.error('[CRITICAL HELP ERROR]', error);
        }
    },
};
