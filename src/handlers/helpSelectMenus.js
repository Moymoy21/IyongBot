import { createEmbed } from '../utils/embeds.js';
import { createButton } from '../utils/components.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from 'discord.js';
// I-import ito para sa Back Button logic
import { createInitialHelpMenu } from '../commands/Core/help.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const ALL_COMMANDS_ID = "help-all-commands";
const CATEGORY_SELECT_ID = "help-category-select"; 
const FOOTER_TEXT = "Made with Iyong Official";
const SUBCOMMAND_TYPE = 1;
const SUBCOMMAND_GROUP_TYPE = 2;

const PET_IMAGES = [
    { name: "Dilophosaurus", url: "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png/revision/latest?cb=20250712071322" },
    { name: "Peryton", url: "https://static.wikia.nocookie.net/growagarden/images/2/26/PerytonPet.png/revision/latest?cb=20260416073019" },
    { name: "Kitsune", url: "https://static.wikia.nocookie.net/growagarden/images/0/04/Kitsune.png/revision/latest?cb=20250918145223" }
];

const CATEGORY_ICONS = {
    Economy: "💰",
    Createboot: "🛍️",
    Utility: "🛠️",
    Core: "⚙️",
    Birthday: "🎂",
    Community: "👥"
};

// --- HELPER PARA SA PET PAGE ---
export function createPetPage(index) {
    const pet = PET_IMAGES[index];
    const embed = createEmbed({
        title: `🐾 ${pet.name}`,
        color: 'primary'
    });
    embed.setImage(pet.url);
    embed.setFooter({ text: `${FOOTER_TEXT} | Pet ${index + 1} of ${PET_IMAGES.length}` });

    const row = new ActionRowBuilder().addComponents(
        createButton(`pet-prev-${index}`, "Prev", "secondary", "⬅️", index === 0),
        createButton(`pet-next-${index}`, "Next", "secondary", "➡️", index === PET_IMAGES.length - 1),
        // Ginawang "Create Listing"
        createButton(`pet-listing-${index}`, "Create Listing", "success", "🛍️", false),
        createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false)
    );

    return { embeds: [embed], components: [row] };
}

function normalizeCommandData(command) {
    const rawData = command?.data;
    if (!rawData) return null;
    const jsonData = typeof rawData.toJSON === 'function' ? rawData.toJSON() : rawData;
    return { ...jsonData, options: Array.isArray(jsonData.options) ? jsonData.options.map(opt => typeof opt?.toJSON === 'function' ? opt.toJSON() : opt) : [] };
}

function buildHelpEntries(command, category) {
    const commandData = normalizeCommandData(command);
    if (!commandData?.name) return [];
    const entries = [];
    const options = commandData.options || [];

    for (const option of options) {
        if (option.type === SUBCOMMAND_TYPE) {
            entries.push({ displayName: `${commandData.name} ${option.name}`, description: option.description, category });
        } else if (option.type === SUBCOMMAND_GROUP_TYPE) {
            for (const nested of (option.options || [])) {
                if (nested.type === SUBCOMMAND_TYPE) entries.push({ displayName: `${commandData.name} ${option.name} ${nested.name}`, description: nested.description, category });
            }
        }
    }
    if (entries.length === 0) entries.push({ displayName: commandData.name, description: commandData.description, category });
    return entries;
}

async function createCategoryCommandsMenu(category, client) {
    const cleanCategory = category.toLowerCase().trim();

    if (cleanCategory === 'createboot') {
        return createPetPage(0);
    }

    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    const icon = CATEGORY_ICONS[categoryName] || "🔍";
    const categoryCommands = [];

    try {
        const categoryPath = path.join(process.cwd(), 'src', 'commands', category);
        const commandFiles = (await fs.readdir(categoryPath)).filter(file => file.endsWith(".js")).sort();
        
        for (const file of commandFiles) {
            const commandModule = await import(`file://${path.join(categoryPath, file)}`);
            if (normalizeCommandData(commandModule.default)) {
                categoryCommands.push(...buildHelpEntries(commandModule.default, categoryName));
            }
        }
    } catch (error) {
        console.error(`[Help Error] Path: ${category}`, error.message);
    }

    const embed = createEmbed({ 
        title: `${icon} ${categoryName} Commands`, 
        description: categoryCommands.length > 0 ? `List of commands:` : `No commands found.`, 
        color: 'primary' 
    });

    if (categoryCommands.length > 0) {
        embed.addFields({ 
            name: "Commands", 
            value: categoryCommands.map(cmd => `\`/${cmd.displayName}\` · ${cmd.description}`).join("\n").substring(0, 1024) 
        });
    }

    embed.setFooter({ text: FOOTER_TEXT });
    const row = new ActionRowBuilder().addComponents(createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false));

    return { embeds: [embed], components: [row] };
}

export const helpCategorySelectMenu = {
    name: "help-category-select",
    async execute(interaction, client) {
        try {
            // --- SELECT MENU HANDLER ---
            if (interaction.isStringSelectMenu()) {
                await interaction.deferUpdate();
                const selected = interaction.values[0];
                
                let result;
                if (selected === ALL_COMMANDS_ID) {
                    result = { embeds: [createEmbed({ title: "📋 Maintenance", color: 'primary' })], components: [new ActionRowBuilder().addComponents(createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false))] };
                } else {
                    result = await createCategoryCommandsMenu(selected, client);
                }

                return await interaction.editReply({ embeds: result.embeds, components: result.components });
            } 
            
            // --- BUTTON HANDLER ---
            else if (interaction.isButton()) {
                const customId = interaction.customId;

                // 1. Back to Main Help
                if (customId === BACK_BUTTON_ID) {
                    await interaction.deferUpdate();
                    const { embeds, components } = await createInitialHelpMenu(client);
                    return await interaction.editReply({ embeds, components });
                }

                // 2. Navigation (Prev/Next)
                if (customId.startsWith('pet-prev-') || customId.startsWith('pet-next-')) {
                    await interaction.deferUpdate();
                    const parts = customId.split('-');
                    let index = parseInt(parts[2]);
                    if (parts[1] === 'next') index++;
                    if (parts[1] === 'prev') index--;
                    const { embeds, components } = createPetPage(index);
                    return await interaction.editReply({ embeds, components });
                }

                // 3. Create Listing (Modal)
                if (customId.startsWith('pet-listing-')) {
                    const index = parseInt(customId.split('-')[2]);
                    const modal = new ModalBuilder()
                        .setCustomId(`listing-modal-${index}`)
                        .setTitle(`Listing: ${PET_IMAGES[index].name}`);

                    const fields = [
                        new TextInputBuilder().setCustomId('listing-price').setLabel("Price").setStyle(TextInputStyle.Short).setPlaceholder("e.g. 500 Coins").setRequired(true),
                        new TextInputBuilder().setCustomId('listing-desc').setLabel("Description").setStyle(TextInputStyle.Paragraph).setPlaceholder("Details about the pet...").setRequired(true)
                    ];

                    modal.addComponents(fields.map(f => new ActionRowBuilder().addComponents(f)));
                    return await interaction.showModal(modal);
                }
            }
        } catch (error) {
            console.error('[CRITICAL] Help interaction error:', error);
        }
    },
};
