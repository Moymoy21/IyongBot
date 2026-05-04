// src/interactions/buttons/create_boot.js

module.exports = {
    customId: 'createboot', // Ito dapat ang ID ng button mo
    async execute(interaction) {
        // Ang listahan ng pet images mo
        const petList = [
            "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png/revision/latest?cb=20250712071322",
            "https://link-ng-image-2.png",
            "https://link-ng-image-3.png"
        ];

        // Format: "1 link", "2 link", etc.
        const formattedList = petList.map((link, index) => `${index + 1} ${link}`).join('\n');

        await interaction.reply({
            content: `**🐾 Pet List:**\n${formattedList}`,
            ephemeral: false // Gawing true kung gusto mo ay private reply
        });
    },
};

