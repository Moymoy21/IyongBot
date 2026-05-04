import { createEmbed } from '../utils/embeds.js';
import { createButton, getPaginationRow } from '../utils/components.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
    Collection, 
    ActionRowBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} from 'discord.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const ALL_COMMANDS_ID = "help-all-commands";
const PAGINATION_PREFIX = "help-page";
const CATEGORY_SELECT_ID = "help-category-select";
const FOOTER_TEXT = "Made with Iyong Official";
const SUBCOMMAND_TYPE = 1;
const SUBCOMMAND_GROUP_TYPE = 2;

// --- DATA NG MGA PETS ---
const PET_IMAGES = [
    { name: "Dilophosaurus", url: "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png/revision/latest?cb=20250712071322" },
    { name: "Peryton", url: "https://static.wikia.nocookie.net/growagarden/images/2/26/PerytonPet.png/revision/latest?cb=20260416073019" }, // Palitan ang link
    { name: "Kitsune", url: "https://static.wikia.nocookie.net/growagarden/images/0/04/Kitsune.png/revision/latest?cb=20250918145223" } // Palitan ang link
];

const CATEGORY_ICONS = {
    Economy: "💰",
    Createboot: "🛍️",
    Utility: "🛠️"
};

const ALLOWED_CATEGORIES = ["economy", "createboot", "utility"];

// --- HELPER PARA SA PET PAGINATION ---
export function createPetPage(index) {
    const pet = PET_IMAGES[index];
    const embed = createEmbed({
        title: `🐾 ${pet.name}`, // Label Name sa taas
        color: 'primary'
    });
    embed.setImage(pet.url);
    embed.setFooter({ text: `${FOOTER_TEXT} | Pet ${index + 1} of ${PET_IMAGES.length}` });

    const row = new ActionRowBuilder().addComponents(
        createButton(`pet-prev-${index}`, "", "secondary", "⬅️", index === 0),
        createButton(`pet-next-${index}`, "", "secondary", "➡️", index === PET_IMAGES.length - 1),
        createButton(`pet-edit-${index}`, "Edit Details", "success", "📝", false), // Button para sa Modal
        createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false)
    );

    return { embeds: [embed], components: [row] };
}

function buildHelpEntries(command, category) {
    const commandData = normalizeCommandData(command);
    if (!commandData?.name) return [];
    const baseName = commandData.name;
    const baseDescription = commandData.description || "No description";
    const options = commandData.options || [];
    const entries = [];

    for (const option of options) {
        if (!option) continue;
        if (option.type === SUBCOMMAND_TYPE) {
            entries.push({ baseName, displayName: `${baseName} ${option.name}`, description: option.description || baseDescription, category });
            continue;
        }
        if (option.type === SUBCOMMAND_GROUP_TYPE) {
            const nestedOptions = option.options || [];
            for (const nested of nestedOptions) {
                if (nested?.type !== SUBCOMMAND_TYPE) continue;
                entries.push({ baseName, displayName: `${baseName} ${option.name} ${nested.name}`, description: nested.description || option.description || baseDescription, category });
            }
        }
    }
    if (entries.length === 0) entries.push({ baseName, displayName: baseName, description: baseDescription, category });
    return entries;
}

function normalizeCommandData(command) {
    const rawData = command?.data;
    if (!rawData) return null;
    const jsonData = typeof rawData.toJSON === 'function' ? rawData.toJSON() : rawData;
    if (!jsonData?.name) return null;
    return { ...jsonData, options: Array.isArray(jsonData.options) ? jsonData.options.map((opt) => typeof opt?.toJSON === 'function' ? opt.toJSON() : opt) : [] };
}

async function createCategoryCommandsMenu(category, client) {
    if (category.toLowerCase() === 'createboot') return createPetPage(0);
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    const icon = CATEGORY_ICONS[categoryName] || "🔍";
    const categoryCommands = [];
    try {
        const categoryPath = path.join(__dirname, "../commands", category);
        const commandFiles = (await fs.readdir(categoryPath)).filter((file) => file.endsWith(".js")).sort();
        for (const file of commandFiles) {
            const commandModule = await import(`file://${path.join(categoryPath, file)}`);
            if (normalizeCommandData(commandModule.default)) categoryCommands.push(...buildHelpEntries(commandModule.default, categoryName));
        }
    } catch (error) { logger.error(error); }
    const embed = createEmbed({ title: `${icon} ${categoryName} Commands`, description: categoryCommands.length > 0 ? `List of commands:` : `No commands found.`, color: 'primary' });
    if (categoryCommands.length > 0) embed.addFields({ name: "Commands", value: categoryCommands.map(cmd => `\`/${cmd.displayName}\` · ${cmd.description}`).join("\n").substring(0, 1024) });
    embed.setFooter({ text: FOOTER_TEXT });
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(createButton(BACK_BUTTON_ID, "Back", "primary", "⬅️", false))] };
}

export async function createAllCommandsMenu(page = 1, client) {
    // ... (Code for All Commands Menu remains same as your original)
}

// --- MAIN INTERACTION HANDLER ---
export const helpCategorySelectMenu = {
    name: CATEGORY_SELECT_ID,
    async execute(interaction, client) {
        try {
            // 1. SELECT MENU HANDLER
            if (interaction.isStringSelectMenu()) {
                await interaction.deferUpdate();
                const selected = interaction.values[0];
                const { embeds, components } = selected === ALL_COMMANDS_ID 
                    ? await createAllCommandsMenu(1, client) 
                    : await createCategoryCommandsMenu(selected, client);
                await interaction.editReply({ embeds, components });
            } 
            
            // 2. BUTTON HANDLER
            else if (interaction.isButton()) {
                const customId = interaction.customId;

                // TRIGGER MODAL (No deferUpdate here!)
                if (customId.startsWith('pet-edit-')) {
                    const index = customId.split('-')[2];
                    const modal = new ModalBuilder()
                        .setCustomId(`pet-modal-${index}`)
                        .setTitle(`Details for ${PET_IMAGES[index].name}`);

                    const ageInput = new TextInputBuilder()
                        .setCustomId('pet-age')
                        .setLabel("Enter Age")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("e.g. 2 Years")
                        .setRequired(true);

                    const weightInput = new TextInputBuilder()
                        .setCustomId('pet-weight')
                        .setLabel("Enter Weight")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("e.g. 15kg")
                        .setRequired(true);

                    const tokenInput = new TextInputBuilder()
                        .setCustomId('pet-token')
                        .setLabel("Enter Token Price")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("e.g. 500 Tokens")
                        .setRequired(true);

                    modal.addComponents(
                        new ActionRowBuilder().addComponents(ageInput),
                        new ActionRowBuilder().addComponents(weightInput),
                        new ActionRowBuilder().addComponents(tokenInput)
                    );

                    await interaction.showModal(modal);
                }
                
                // SLIDE NAVIGATION (Left/Right)
                else if (customId.startsWith('pet-prev-') || customId.startsWith('pet-next-')) {
                    await interaction.deferUpdate();
                    const parts = customId.split('-');
                    let index = parseInt(parts[2]);
                    if (parts[1] === 'next') index++;
                    if (parts[1] === 'prev') index--;

                    const { embeds, components } = createPetPage(index);
                    await interaction.editReply({ embeds, components });
                }
            }
        } catch (error) {
            logger.error('Error in help interaction:', error);
        }
    },
};
