import { createEmbed } from '../utils/embeds.js';
import { createButton } from '../utils/components.js';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

const BACK_BUTTON_ID = "help-back-to-main";
const NEXT_PET_ID = "pet_next_action";
const PREV_PET_ID = "pet_prev_action";
const LISTING_PET_ID = "pet_listing_action";

const PET_IMAGES = [
    { name: "Dilophosaurus", url: "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png/revision/latest?cb=20250712071322" },
    { name: "Peryton", url: "https://static.wikia.nocookie.net/growagarden/images/2/26/PerytonPet.png/revision/latest?cb=20260416073019" },
    { name: "Kitsune", url: "https://static.wikia.nocookie.net/growagarden/images/0/04/Kitsune.png/revision/latest?cb=20250918145223" }
];

export function createPetPage(index) {
    const pet = PET_IMAGES[index];
    const embed = createEmbed({ title: `🐾 ${pet.name}`, color: 'primary' });
    embed.setImage(pet.url);
    embed.setFooter({ text: `Page ${index + 1} of ${PET_IMAGES.length} | Made with Iyong Official` });

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
        try {
            const { customId } = interaction;

            // 1. MODAL (CREATE LISTING) - Triggered before defer
            if (customId === LISTING_PET_ID) {
                const footer = interaction.message.embeds[0].footer.text;
                const index = parseInt(footer.match(/\d+/)[0]) - 1;
                const modal = new ModalBuilder().setCustomId(`listing_modal_${index}`).setTitle(`Listing: ${PET_IMAGES[index].name}`);
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('price').setLabel("Price").setStyle(TextInputStyle.Short).setRequired(true)));
                return await interaction.showModal(modal);
            }

            // 2. DEFER UPDATE (For buttons and menus)
            if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

            // 3. SELECT MENU LOGIC
            if (interaction.isStringSelectMenu() && interaction.values[0] === 'createboot') {
                return await interaction.editReply(createPetPage(0));
            }

            // 4. NAVIGATION LOGIC (STATIC IDS)
            if (customId === NEXT_PET_ID || customId === PREV_PET_ID) {
                const footer = interaction.message.embeds[0].footer.text;
                let index = parseInt(footer.match(/\d+/)[0]) - 1;
                index = (customId === NEXT_PET_ID) ? index + 1 : index - 1;
                return await interaction.editReply(createPetPage(index));
            }

            // 5. BACK BUTTON
            if (customId === BACK_BUTTON_ID) {
                return await interaction.editReply({ content: "🏠 Menu reset. Type `/help` again.", embeds: [], components: [] });
            }
        } catch (e) { console.error('[DEBUG ERROR]', e); }
    }
};

// EXPORTS PARA SA INTERACTION LOADER
export const petNext = { name: NEXT_PET_ID, execute: helpCategorySelectMenu.execute };
export const petPrev = { name: PREV_PET_ID, execute: helpCategorySelectMenu.execute };
export const petList = { name: LISTING_PET_ID, execute: helpCategorySelectMenu.execute };
export const helpBack = { name: BACK_BUTTON_ID, execute: helpCategorySelectMenu.execute };
