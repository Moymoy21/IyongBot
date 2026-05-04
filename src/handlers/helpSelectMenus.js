import { createEmbed } from '../utils/embeds.js';
import { createButton } from '../utils/components.js';
import { 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from 'discord.js';

const BACK_BUTTON_ID = "help-back-to-main";
const NEXT_PET_ID = "pet_next_action";
const PREV_PET_ID = "pet_prev_action";
const LISTING_PET_ID = "pet_listing_action";
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
    // IMPORTANTE: Dito kukunin ng bot ang "Page Number" mamaya
    embed.setFooter({ text: `Page ${index + 1} of ${PET_IMAGES.length} | ${FOOTER_TEXT}` });

    const row = new ActionRowBuilder().addComponents(
        createButton(PREV_PET_ID, "Prev", "secondary", "⬅️", index === 0),
        createButton(NEXT_PET_ID, "Next", "secondary", "➡️", index === PET_IMAGES.length - 1),
        createButton(LISTING_PET_ID, "Create Listing", "success", "🛍️", false),
        createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false)
    );
    return { embeds: [embed], components: [row] };
}

export const helpCategorySelectMenu = {
    name: "help-category-select",
    async execute(interaction, client) {
        const { customId } = interaction;

        try {
            // 1. MODAL (No defer)
            if (customId === LISTING_PET_ID) {
                const footerText = interaction.message.embeds[0].footer.text;
                const index = parseInt(footerText.match(/\d+/)[0]) - 1;
                
                const modal = new ModalBuilder()
                    .setCustomId(`listing_modal_${index}`)
                    .setTitle(`Listing: ${PET_IMAGES[index].name}`);

                const row = new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('price').setLabel("Price").setStyle(TextInputStyle.Short).setRequired(true)
                );
                modal.addComponents(row);
                return await interaction.showModal(modal);
            }

            // 2. DEFER PARA SA BUTTONS/MENU
            if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

            // 3. SELECT MENU
            if (interaction.isStringSelectMenu() && interaction.values[0] === 'createboot') {
                return await interaction.editReply(createPetPage(0));
            }

            // 4. NAVIGATION BUTTONS
            if (customId === NEXT_PET_ID || customId === PREV_PET_ID) {
                const footerText = interaction.message.embeds[0].footer.text;
                let index = parseInt(footerText.match(/\d+/)[0]) - 1;

                if (customId === NEXT_PET_ID) index++;
                else index--;

                return await interaction.editReply(createPetPage(index));
            }

            if (customId === BACK_BUTTON_ID) {
                return await interaction.editReply({ content: "Paki-type ulit ang `/help`." });
            }

        } catch (error) {
            console.error('[CRITICAL ERROR]', error);
        }
    }
};

// EXPORTS PARA SA HANDLER LOADER
export const petNext = { name: NEXT_PET_ID, execute: helpCategorySelectMenu.execute };
export const petPrev = { name: PREV_PET_ID, execute: helpCategorySelectMenu.execute };
export const petList = { name: LISTING_PET_ID, execute: helpCategorySelectMenu.execute };
export const helpBack = { name: BACK_BUTTON_ID, execute: helpCategorySelectMenu.execute };
