// src/interactions/modals/listing.js
export default {
    name: "listing_modal", // Ito dapat ang simula ng CustomID ng modal mo
    async execute(interaction, client) {
        const mutation = interaction.fields.getTextInputValue('mutation');
        const age = interaction.fields.getTextInputValue('age');
        const weight = interaction.fields.getTextInputValue('weight');
        const price = interaction.fields.getTextInputValue('price');

        // Dito mo pwede i-save sa database o i-log muna
        await interaction.reply({ 
            content: `✅ **Pet Listed Successfully!**\n🔹 Mutation: ${mutation}\n🔹 Age: ${age}\n🔹 Weight: ${weight}\n💰 Price: ${price} Tokens`,
            ephemeral: true 
        });
    }
};

