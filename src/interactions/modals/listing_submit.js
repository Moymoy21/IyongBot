import { activeListings, ALL_AVAILABLE_PETS, createActiveListingPage } from '../../handlers/helpSelectMenus.js';

export default {
    // GAMITIN ANG PREFIX: Dahil ang ID natin ay "submit_listing_Dilophosaurus"
    // Ang handler mo ay dapat marunong mag-check kung "nagsisimula" ito sa submit_listing
    name: "submit_listing", 
    async execute(interaction, client) {
        try {
            // 1. Kunin ang pet name mula sa customId
            const petName = interaction.customId.replace('submit_listing_', '');
            
            // 2. Hanapin ang base data para sa URL ng image
            const petBaseData = ALL_AVAILABLE_PETS.find(p => p.name === petName);

            // 3. Kunin ang data mula sa fields
            const newListing = {
                name: petName,
                url: petBaseData?.url || "",
                mutation: interaction.fields.getTextInputValue('mutation'),
                age: interaction.fields.getTextInputValue('age'),
                weight: interaction.fields.getTextInputValue('weight'),
                price: interaction.fields.getTextInputValue('price')
            };

            // 4. I-save sa listahan
            activeListings.push(newListing);

            // 5. I-update ang view (ipakita ang pinaka-huling in-add)
            const updatedView = createActiveListingPage(activeListings.length - 1);
            
            // 6. Mag-reply (Kailangan mag-reply ang bot para hindi mag-error)
            await interaction.reply({ 
                content: `✅ Listed: **${petName}**! Check mo na sa \`/help\`.`, 
                ephemeral: true 
            });

            // 7. I-update ang main help message para makita agad ang pagbabago
            if (interaction.message) {
                await interaction.message.edit(updatedView);
            }
        } catch (error) {
            console.error('[MODAL ERROR]', error);
            // Pag may error, sabihan ang user kesa "Something went wrong" lang
            if (!interaction.replied) {
                await interaction.reply({ content: "May error sa pag-save ng listing.", ephemeral: true });
            }
        }
    }
};
