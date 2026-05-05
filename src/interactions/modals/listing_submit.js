import { activeListings, ALL_AVAILABLE_PETS, createActiveListingPage } from '../../handlers/helpSelectMenus.js';

export const listingSubmit = {
    name: "submit_listing", 
    async execute(interaction, client) {
        try {
            const petName = interaction.customId.replace('submit_listing_', '');
            const petBaseData = ALL_AVAILABLE_PETS.find(p => p.name === petName);

            const newListing = {
                name: petName,
                url: petBaseData?.url || "",
                mutation: interaction.fields.getTextInputValue('mutation'),
                age: interaction.fields.getTextInputValue('age'),
                weight: interaction.fields.getTextInputValue('weight'),
                price: interaction.fields.getTextInputValue('price')
            };

            activeListings.push(newListing);
            
            // DITO SYA NAG-EERROR DATI KASI HINDI MATCH ANG PANGALAN
            const updatedView = createActiveListingPage(activeListings.length - 1);
            
            await interaction.reply({ 
                content: `✅ Listed: **${petName}**!`, 
                ephemeral: true 
            });

            if (interaction.message) {
                await interaction.message.edit(updatedView);
            }
        } catch (error) {
            console.error('[MODAL ERROR]', error);
        }
    }
};

export default listingSubmit;
