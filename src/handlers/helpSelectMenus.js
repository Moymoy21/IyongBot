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
const CATEGORY_SELECT_ID = "help-category-select"; // Siguraduhing match ito sa help.js
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

export function createPetPage(index) {
    const pet = PET_IMAGES[index];
    const embed = createEmbed({
        title: `🐾 ${pet.name}`,
        color: 'primary'
    });
    embed.setImage(pet.url);
    embed.setFooter({ text: `${FOOTER_TEXT} | Pet ${index + 1} of ${PET_IMAGES.length}` });

    const row = new ActionRowBuilder().addComponents(
        // NILAGYAN NG LABEL NA "Prev" AT "Next" PARA HINDI MAG-ERROR
        createButton(`pet-prev-${index}`, "Prev", "secondary", "⬅️", index === 0),
        createButton(`pet-next-${index}`, "Next", "secondary", "➡️", index === PET_IMAGES.length - 1),
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

async function createCategoryCommandsMenu(category, client) {
    const cleanCategory = category.toLowerCase().trim();

    // SHORTCUT CHECK
    if (cleanCategory === 'createboot') {
        console.log("[DEBUG] Pet Shortcut Triggered");
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
    name: "help-category-select", // STRING LITERAL PARA SIGURADONG MATCH
    async execute(interaction, client) {
        try {
            // 1. STRING SELECT MENU HANDLER
            if (interaction.isStringSelectMenu()) {
                const selected = interaction.values[0];
                console.log(`[DEBUG] Menu Clicked! Value: ${selected}`);
                
                await interaction.deferUpdate();
                
                let result;
                if (selected === ALL_COMMANDS_ID) {
                    result = { embeds: [createEmbed({ title: "📋 Maintenance", color: 'primary' })], components: [new ActionRowBuilder().addComponents(createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false))] };
                } else {
                    result = await createCategoryCommandsMenu(selected, client);
                }

                return await interaction.editReply({ 
                    embeds: result.embeds, 
                    components: result.components 
                });
            } 
            
            // 2. BUTTON HANDLER (Para sa navigation at edit)
            else if (interaction.isButton()) {
                const customId = interaction.customId;
                console.log(`[DEBUG] Button Clicked! ID: ${customId}`);

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
                
                if (customId.startsWith('pet-prev-') || customId.startsWith('pet-next-')) {
                    await interaction.deferUpdate();
                    const parts = customId.split('-');
                    let index = parseInt(parts[2]);
                    if (parts[1] === 'next') index++;
                    if (parts[1] === 'prev') index--;
                    const { embeds, components } = createPetPage(index);
                    return await interaction.editReply({ embeds, components });
                }

                if (customId === BACK_BUTTON_ID) {
                    // Dito dapat i-reload ang main help menu
                    // Pwedeng mag-followUp o editReply depende sa setup mo
                }
            }
        } catch (error) {
            console.error('[CRITICAL] Help interaction error:', error);
        }
    },
};
