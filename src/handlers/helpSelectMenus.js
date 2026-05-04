import { createEmbed } from '../utils/embeds.js';
import { createButton } from '../utils/components.js';
import { 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ComponentType 
} from 'discord.js';

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

// ITO ANG MAGHA-HANDLE NG LAHAT
export const helpCategorySelectMenu = {
    name: "help-category-select", 
    async execute(interaction, client) {
        const { customId } = interaction;

        try {
            // 1. HANDLE MODAL (CREATE LISTING) - No defer here!
            if (customId.startsWith('pet_listing_')) {
                const index = parseInt(customId.split('_')[2]);
                const modal = new ModalBuilder()
                    .setCustomId(`listing_modal_${index}`)
                    .setTitle(`Listing: ${PET_IMAGES[index].name}`);

                const priceInput = new TextInputBuilder()
                    .setCustomId('price')
                    .setLabel("Selling Price")
                    .setPlaceholder("Enter amount...")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const descInput = new TextInputBuilder()
                    .setCustomId('desc')
                    .setLabel("Item Description")
                    .setPlaceholder("Details about the pet...")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(priceInput),
                    new ActionRowBuilder().addComponents(descInput)
                );
                return await interaction.showModal(modal);
            }

            // 2. FOR EVERYTHING ELSE - DEFER UPDATE
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate();
            }

            // 3. HANDLE BUTTONS (PREV/NEXT/BACK)
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
                    return await interaction.editReply({ 
                        content: "🏠 Menu has been reset. Please use `/help` to restart.", 
                        embeds: [], 
                        components: [] 
                    });
                }
            }

            // 4. HANDLE SELECT MENU
            if (interaction.isStringSelectMenu()) {
                const selected = interaction.values[0];
                if (selected === 'createboot') {
                    const result = createPetPage(0);
                    return await interaction.editReply(result);
                }
                // Handle other categories here if needed
            }

        } catch (error) {
            console.error('[FINAL HANDLER ERROR]', error);
        }
    }
};

// DAHIL ANG INTERACTION HANDLER MO AY NAGHAHANAP NG MODULE PER ID...
// Gagawa tayo ng "Aliases" para mahanap ng bot itong file na ito
export const petNextHandler = { name: "pet_next", execute: helpCategorySelectMenu.execute };
export const petPrevHandler = { name: "pet_prev", execute: helpCategorySelectMenu.execute };
export const petListingHandler = { name: "pet_listing", execute: helpCategorySelectMenu.execute };
export const helpBackHandler = { name: BACK_BUTTON_ID, execute: helpCategorySelectMenu.execute };
