import { activeListings, ALL_AVAILABLE_PETS, createActiveListingPage } from '../../handlers/helpSelectMenus.js';

export default {
    name: "submit_listing", 
    async execute(interaction, client) {
        try {
            // 1. Kunin ang pangalan ng pet mula sa Custom ID
            const petName = interaction.customId.replace('submit_listing_', '');
            
            // 2. Hanapin ang kaukulang image URL
            const petBaseData = ALL_AVAILABLE_PETS.find(p => p.name === petName);

            // 3. Buuin ang bagong listing object (may sellerId na para sa security)
            const newListing = {
                name: petName,
                url: petBaseData?.url || "",
                mutation: interaction.fields.getTextInputValue('mutation'),
                age: interaction.fields.getTextInputValue('age'),
                weight: interaction.fields.getTextInputValue('weight'),
                price: interaction.fields.getTextInputValue('price'),
                sellerId: interaction.user.id, // Importante ito para sa Ownership Check
                sellerTag: interaction.user.tag
            };

            // 4. I-save sa temporary memory (activeListings array)
            activeListings.push(newListing);

            // 5. I-generate ang updated view para sa embed
            const updatedView = createActiveListingPage(activeListings.length - 1);
            
            // 6. Mag-reply sa user (Ephemeral para sila lang makakita ng success message)
            await interaction.reply({ 
                content: `✅ Success! Na-list na ang **${petName}** mo sa market.`, 
                ephemeral: true 
            });

            // 7. I-update ang original message (yung /help embed)
            if (interaction.message) {
                await interaction.message.edit(updatedView);
            }
        } catch (error) {
            console.error('[MODAL SUBMIT ERROR]', error);
            if (!interaction.replied) {
                await interaction.reply({ content: "May error sa pag-save ng iyong listing.", ephemeral: true });
            }
        }
    }
};
