import { activeListings, ALL_AVAILABLE_PETS, createActiveListingPage } from '../../handlers/helpSelectMenus.js';

export default {
    name: "submit_listing", // Ito ang hahanapin ng bot (prefix match)
    async execute(interaction, client) {
        // 1. Kunin ang pangalan ng pet mula sa CustomID (e.g., submit_listing_Dilophosaurus)
        const petName = interaction.customId.replace('submit_listing_', '');
        
        // 2. Hanapin ang image/data ng pet na pinili
        const petBaseData = ALL_AVAILABLE_PETS.find(p => p.name === petName);

        // 3. Kunin ang mga tinype mo sa apat na boxes
        const newListing = {
            name: petName,
            url: petBaseData.url,
            mutation: interaction.fields.getTextInputValue('mutation'),
            age: interaction.fields.getTextInputValue('age'),
            weight: interaction.fields.getTextInputValue('weight'),
            price: interaction.fields.getTextInputValue('price')
        };

        // 4. ISAVE NA NATIN SA LISTAHAN! (Step 3 Magic)
        activeListings.push(newListing);

        // 5. I-update ang message para ipakita agad yung bagong listahan
        const update = createActiveListingPage(activeListings.length - 1);
        
        await interaction.reply({ 
            content: `✅ Success! Na-list na ang **${petName}** mo.`, 
            ephemeral: true 
        });

        // I-edit ang original message para makita yung bagong pet agad
        if (interaction.message) {
            await interaction.message.edit(update);
        }
    }
};
