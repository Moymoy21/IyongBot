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
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const ALL_COMMANDS_ID = "help-all-commands";
const CATEGORY_SELECT_ID = "help-category-select";
const FOOTER_TEXT = "Made with Iyong Official";
const SUBCOMMAND_TYPE = 1;
const SUBCOMMAND_GROUP_TYPE = 2;

// --- DATA NG MGA PETS ---
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
        createButton(`pet-prev-${index}`, "", "secondary", "⬅️", index === 0),
        createButton(`pet-next-${index}`, "", "secondary", "➡️", index === PET_IMAGES.length - 1),
        createButton(`pet-edit-${index}`, "Edit Details", "success", "📝", false),
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

// --- ITO ANG PINAKAMAHALAGANG PART ---
async function createCategoryCommandsMenu(category, client) {
    // 1. Dito lang natin gagawing lowercase para sa check
    const cleanCategory = category.toLowerCase().trim();

    // SHORTCUT PARA SA PETS (CREATEBOOT)
    // Kahit "Createboot" o "createboot" ang matanggap, papasok siya rito
    if (cleanCategory === 'createboot' || cleanCategory.includes('boot')) {
        console.log("[Help Debug] Shortcut triggered!");
        return createPetPage(0);
    }

    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    const icon = CATEGORY_ICONS[categoryName] || "🔍";
    const categoryCommands = [];

    try {
        // GAMITIN ANG ORIGINAL 'category' PARA SA PATH (Case-Sensitive Match sa GitHub)
        const categoryPath = path.join(process.cwd(), 'src', 'commands', category);
        
        console.log(`[Help Log] Reading folder: ${categoryPath}`);

        const commandFiles = (await fs.readdir(categoryPath)).filter(file => file.endsWith(".js")).sort();
        
        for (const file of commandFiles) {
            const commandModule = await import(`file://${path.join(categoryPath, file)}`);
            if (normalizeCommandData(commandModule.default)) {
                categoryCommands.push(...buildHelpEntries(commandModule.default, categoryName));
            }
        }
    } catch (error) {
        console.error(`[Help Error] Folder error for ${category}:`, error.message);
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


export async function createAllCommandsMenu(page = 1, client) {
    const embed = createEmbed({ title: "📋 All Commands", description: "Maintenance", color: 'primary' });
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false))] };
}

export const helpCategorySelectMenu = {
    name: CATEGORY_SELECT_ID,
    async execute(interaction, client) {
        try {
            if (interaction.isStringSelectMenu()) {
                await interaction.deferUpdate();
                const selected = interaction.values[0];
                
                const result = selected === ALL_COMMANDS_ID 
                    ? await createAllCommandsMenu(1, client) 
                    : await createCategoryCommandsMenu(selected, client);

                return await interaction.editReply({ embeds: result.embeds, components: result.components });
            } 
            
            else if (interaction.isButton()) {
                const customId = interaction.customId;

                // MODAL FOR PETS
                if (customId.startsWith('pet-edit-')) {
                    const index = parseInt(customId.split('-')[2]);
                    const modal = new ModalBuilder().setCustomId(`pet-modal-${index}`).setTitle(`Edit: ${PET_IMAGES[index].name}`);
                    const fields = [
                        new TextInputBuilder().setCustomId('pet-age').setLabel("Age").setStyle(TextInputStyle.Short).setRequired(true),
                        new TextInputBuilder().setCustomId('pet-weight').setLabel("Weight").setStyle(TextInputStyle.Short).setRequired(true),
                        new TextInputBuilder().setCustomId('pet-token').setLabel("Token Price").setStyle(TextInputStyle.Short).setRequired(true),
                        new TextInputBuilder().setCustomId('pet-mutation').setLabel("Mutation").setStyle(TextInputStyle.Short).setRequired(true)
                    ];
                    modal.addComponents(fields.map(f => new ActionRowBuilder().addComponents(f)));
                    return await interaction.showModal(modal);
                }
                
                // PET NAVIGATION
                if (customId.startsWith('pet-prev-') || customId.startsWith('pet-next-')) {
                    await interaction.deferUpdate();
                    const parts = customId.split('-');
                    let index = parseInt(parts[2]);
                    if (parts[1] === 'next') index++;
                    if (parts[1] === 'prev') index--;
                    const { embeds, components } = createPetPage(index);
                    return await interaction.editReply({ embeds, components });
                }

                // BACK BUTTON
                if (customId === BACK_BUTTON_ID) {
                    // Dito ay kailangan mong i-import ang createInitialHelpMenu 
                    // o i-re-execute ang main help command logic
                    // Para sa ngayon, pwedeng i-reply ang placeholder
                }
            }
        } catch (error) {
            console.error('Help interaction error:', error);
        }
    },
};
