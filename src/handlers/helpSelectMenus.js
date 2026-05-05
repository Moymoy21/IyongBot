import { createEmbed } from '../utils/embeds.js';
import { createButton } from '../utils/components.js';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } from 'discord.js';

const BACK_BUTTON_ID = "help-back-to-main";
const NEXT_PET_ID = "pet_next_action";
const PREV_PET_ID = "pet_prev_action";
const LISTING_PET_ID = "pet_listing_action";
const REMOVE_PET_ID = "pet_remove_action";

const PET_IMAGES = [
    { name: "Dilophosaurus", url: "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png/revision/latest?cb=20250712071322" },
    { name: "Peryton", url: "https://static.wikia.nocookie.net/growagarden/images/2/26/PerytonPet.png/revision/latest?cb=20260416073019" },
    { name: "Kitsune", url: "https://static.wikia.nocookie.net/growagarden/images/0/04/Kitsune.png/revision/latest?cb=20250918145223" }
];

// Reusable Menu para sa lahat ng pages
const createCategoryMenu = () => {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help-category-select')
            .setPlaceholder('Select a category to add pets...')
            .addOptions([
                { label: 'Createboot (Add Pet)', value: 'createboot', emoji: '🛍️' },
                { label: 'Economy', value: 'economy', emoji: '💰' }
            ])
    );
};

export function createPetPage(index) {
    const pet = PET_IMAGES[index];
    const embed = createEmbed({ 
        title: `🏪 Active Listing: ${pet.name}`, 
        description: "Manage your listed pets below.",
        color: 'primary' 
    });
    embed.setImage(pet.url);
    embed.setFooter({ text: `Page ${index + 1} of ${PET_IMAGES.length} | Made with Iyong Official` });

    const navRow = new ActionRowBuilder().addComponents(
        createButton(PREV_PET_ID, "Prev", "secondary", "⬅️", index === 0),
        createButton(NEXT_PET_ID, "Next", "secondary", "➡️", index === PET_IMAGES.length - 1),
        createButton(LISTING_PET_ID, "Add Pet", "success", "➕", false),
        createButton(REMOVE_PET_ID, "Remove", "danger", "🗑️", false)
    );

    return { embeds: [embed], components: [navRow, createCategoryMenu()] };
}

export const helpCategorySelectMenu = {
    name: "help-category-select",
    async execute(interaction, client) {
        try {
            const { customId } = interaction;

            // 1. MODAL (CREATE LISTING)
            if (customId === LISTING_PET_ID) {
                const footer = interaction.message.embeds[0].footer.text;
                const index = parseInt(footer.match(/\d+/)[0]) - 1;
                const modal = new ModalBuilder().setCustomId(`listing_modal_${index}`).setTitle(`Listing: ${PET_IMAGES[index].name}`);
                
                const rows = [
                    new TextInputBuilder().setCustomId('mutation').setLabel("Pet Mutation").setStyle(TextInputStyle.Short).setRequired(true),
                    new TextInputBuilder().setCustomId('age').setLabel("Pet Age").setStyle(TextInputStyle.Short).setRequired(true),
                    new TextInputBuilder().setCustomId('weight').setLabel("Pet Weight").setStyle(TextInputStyle.Short).setRequired(true),
                    new TextInputBuilder().setCustomId('price').setLabel("Token Price").setStyle(TextInputStyle.Short).setRequired(true)
                ].map(input => new ActionRowBuilder().addComponents(input));

                modal.addComponents(...rows);
                return await interaction.showModal(modal);
            }

            if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate();

            // 2. REMOVE LOGIC
            if (customId === REMOVE_PET_ID) {
                return await interaction.editReply({ content: "⚠️ Pet has been removed from listing!", embeds: [], components: [createCategoryMenu()] });
            }

            // 3. NAVIGATION & CATEGORY SELECT
            if (interaction.isStringSelectMenu() && interaction.values[0] === 'createboot') {
                return await interaction.editReply(createPetPage(0));
            }

            if (customId === NEXT_PET_ID || customId === PREV_PET_ID) {
                const footer = interaction.message.embeds[0].footer.text;
                let index = parseInt(footer.match(/\d+/)[0]) - 1;
                index = (customId === NEXT_PET_ID) ? index + 1 : index - 1;
                return await interaction.editReply(createPetPage(index));
            }
        } catch (e) { console.error(e); }
    }
};

export const petNext = { name: NEXT_PET_ID, execute: helpCategorySelectMenu.execute };
export const petPrev = { name: PREV_PET_ID, execute: helpCategorySelectMenu.execute };
export const petList = { name: LISTING_PET_ID, execute: helpCategorySelectMenu.execute };
export const petRemove = { name: REMOVE_PET_ID, execute: helpCategorySelectMenu.execute };
