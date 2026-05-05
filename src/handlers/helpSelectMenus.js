import { createEmbed } from '../utils/embeds.js';
import { createButton } from '../utils/components.js';
import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } from 'discord.js';

const NEXT_PET_ID = "pet_next_action";
const PREV_PET_ID = "pet_prev_action";
const LISTING_PET_ID = "pet_listing_action";
const REMOVE_PET_ID = "pet_remove_action";

// Listahan ng lahat ng pwedeng i-list (A-Z)
const ALL_AVAILABLE_PETS = [
    { name: "Dilophosaurus", url: "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png" },
    { name: "Kitsune", url: "https://static.wikia.nocookie.net/growagarden/images/0/04/Kitsune.png" },
    { name: "Peryton", url: "https://static.wikia.nocookie.net/growagarden/images/2/26/PerytonPet.png" }
].sort((a, b) => a.name.localeCompare(b.name));

// Dito mai-store ang active listings (Temporary)
let activeListings = []; 

// Function para sa Empty State
export function createEmptyHelp() {
    const embed = createEmbed({
        title: "🏪 Your Active Listings",
        description: "You don't have any active pet listings yet.\n\nUse the menu below to select a pet and start listing!",
        color: 'primary'
    });
    embed.setFooter({ text: "Made with Iyong Official" });

    return { embeds: [embed], components: [createCategoryMenu()] };
}

// Function para sa Menu (A-Z List)
const createCategoryMenu = () => {
    return new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('help-category-select')
            .setPlaceholder('🛒 Select a Pet to List (A-Z)')
            .addOptions(ALL_AVAILABLE_PETS.map(pet => ({
                label: pet.name,
                value: `list_this_${pet.name}`,
                emoji: '🐾'
            })))
    );
};

// Function para sa Active Listing View
export function createActiveListingPage(index) {
    if (activeListings.length === 0) return createEmptyHelp();

    const pet = activeListings[index];
    const embed = createEmbed({ 
        title: `🏪 Active Listing: ${pet.name}`, 
        description: `**Details:**\n🔹 Mutation: ${pet.mutation}\n🔹 Age: ${pet.age}\n🔹 Weight: ${pet.weight}\n💰 Price: ${pet.price} Tokens`,
        color: 'primary' 
    });
    embed.setImage(pet.url);
    embed.setFooter({ text: `Listing ${index + 1} of ${activeListings.length} | Made with Iyong Official` });

    const navRow = new ActionRowBuilder().addComponents(
        createButton(PREV_PET_ID, "Prev", "secondary", "⬅️", index === 0),
        createButton(NEXT_PET_ID, "Next", "secondary", "➡️", index === activeListings.length - 1),
        createButton(REMOVE_PET_ID, "Remove Listing", "danger", "🗑️", false)
    );

    return { embeds: [embed], components: [navRow, createCategoryMenu()] };
}

export const helpCategorySelectMenu = {
    name: "help-category-select",
    async execute(interaction, client) {
        try {
            const { customId, values } = interaction;

            // 1. SELECT PET FROM MENU
            if (interaction.isStringSelectMenu() && values[0].startsWith('list_this_')) {
                const petName = values[0].replace('list_this_', '');
                const petData = ALL_AVAILABLE_PETS.find(p => p.name === petName);

                const modal = new ModalBuilder()
                    .setCustomId(`submit_listing_${petName}`)
                    .setTitle(`Listing Details: ${petName}`);

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

            // 2. NAVIGATION
            if (customId === NEXT_PET_ID || customId === PREV_PET_ID) {
                const footer = interaction.message.embeds[0].footer.text;
                let index = parseInt(footer.match(/\d+/)[0]) - 1;
                index = (customId === NEXT_PET_ID) ? index + 1 : index - 1;
                return await interaction.editReply(createActiveListingPage(index));
            }

            // 3. REMOVE
            if (customId === REMOVE_PET_ID) {
                const footer = interaction.message.embeds[0].footer.text;
                let index = parseInt(footer.match(/\d+/)[0]) - 1;
                activeListings.splice(index, 1); // Delete from array
                return await interaction.editReply(activeListings.length > 0 ? createActiveListingPage(0) : createEmptyHelp());
            }

        } catch (e) { console.error(e); }
    }
};

// Export activeListings para ma-access ng modal handler
export { activeListings, ALL_AVAILABLE_PETS };
export const petNext = { name: NEXT_PET_ID, execute: helpCategorySelectMenu.execute };
export const petPrev = { name: PREV_PET_ID, execute: helpCategorySelectMenu.execute };
export const petRemove = { name: REMOVE_PET_ID, execute: helpCategorySelectMenu.execute };
