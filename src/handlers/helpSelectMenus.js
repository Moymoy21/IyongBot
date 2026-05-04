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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACK_BUTTON_ID = "help-back-to-main";
const ALL_COMMANDS_ID = "help-all-commands";
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

// --- HELPERS ---
export function createPetPage(index) {
    const pet = PET_IMAGES[index];
    const embed = createEmbed({ title: `🐾 ${pet.name}`, color: 'primary' });
    embed.setImage(pet.url);
    embed.setFooter({ text: `${FOOTER_TEXT} | Pet ${index + 1} of ${PET_IMAGES.length}` });

    const row = new ActionRowBuilder().addComponents(
        createButton(`pet-prev-${index}`, "Prev", "secondary", "⬅️", index === 0),
        createButton(`pet-next-${index}`, "Next", "secondary", "➡️", index === PET_IMAGES.length - 1),
        createButton(`pet-listing-${index}`, "Create Listing", "success", "🛍️", false),
        createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false)
    );
    return { embeds: [embed], components: [row] };
}

function normalizeCommandData(command) {
    const rawData = command?.data;
    if (!rawData) return null;
    return typeof rawData.toJSON === 'function' ? rawData.toJSON() : rawData;
}

function buildHelpEntries(command, category) {
    const commandData = normalizeCommandData(command);
    if (!commandData?.name) return [];
    const entries = [];
    const options = commandData.options || [];

    for (const option of options) {
        if (option.type === SUBCOMMAND_TYPE) {
            entries.push({ displayName: `${commandData.name} ${option.name}`, description: option.description });
        }
    }
    if (entries.length === 0) entries.push({ displayName: commandData.name, description: commandData.description });
    return entries;
}

async function createCategoryCommandsMenu(category, client) {
    const cleanCategory = category.toLowerCase().trim();
    if (cleanCategory === 'createboot') return createPetPage(0);

    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    const icon = CATEGORY_ICONS[categoryName] || "🔍";
    const categoryCommands = [];

    try {
        const categoryPath = path.join(process.cwd(), 'src', 'commands', category);
        const commandFiles = (await fs.readdir(categoryPath)).filter(file => file.endsWith(".js"));
        
        for (const file of commandFiles) {
            const commandModule = await import(`file://${path.join(categoryPath, file)}?update=${Date.now()}`);
            const entries = buildHelpEntries(commandModule.default, categoryName);
            categoryCommands.push(...entries);
        }
    } catch (e) { console.error(e); }

    const embed = createEmbed({ 
        title: `${icon} ${categoryName} Commands`, 
        description: categoryCommands.length > 0 ? "List of available commands:" : "No commands found.", 
        color: 'primary' 
    });

    if (categoryCommands.length > 0) {
        embed.addFields({ 
            name: "Commands", 
            value: categoryCommands.map(cmd => `\`/${cmd.displayName}\` · ${cmd.description}`).join("\n").substring(0, 1024) 
        });
    }

    const row = new ActionRowBuilder().addComponents(createButton(BACK_BUTTON_ID, "Back", "primary", "🏠", false));
    return { embeds: [embed], components: [row] };
}

export const helpCategorySelectMenu = {
    name: "help-category-select",
    async execute(interaction, client) {
        try {
            const customId = interaction.customId;

            // 1. MODAL - Dapat mauna ito dahil bawal mag-deferUpdate bago mag-showModal
            if (interaction.isButton() && customId.startsWith('pet-listing-')) {
                const index = parseInt(customId.split('-')[2]);
                const modal = new ModalBuilder().setCustomId(`listing-modal-${index}`).setTitle(`Listing: ${PET_IMAGES[index].name}`);
                const fields = [
                    new TextInputBuilder().setCustomId('price').setLabel("Price").setStyle(TextInputStyle.Short).setRequired(true),
                    new TextInputBuilder().setCustomId('desc').setLabel("Description").setStyle(TextInputStyle.Paragraph).setRequired(true)
                ];
                modal.addComponents(fields.map(f => new ActionRowBuilder().addComponents(f)));
                return await interaction.showModal(modal);
            }

            // 2. LAHAT NG IBANG INTERACTION - Pwedeng mag-deferUpdate
            await interaction.deferUpdate();

            if (interaction.isStringSelectMenu()) {
                const result = await createCategoryCommandsMenu(interaction.values[0], client);
                return await interaction.editReply({ embeds: result.embeds, components: result.components });
            } 
            
            if (interaction.isButton()) {
                if (customId.startsWith('pet-prev-') || customId.startsWith('pet-next-')) {
                    const parts = customId.split('-');
                    let index = parseInt(parts[2]);
                    if (parts[1] === 'next') index++;
                    if (parts[1] === 'prev') index--;
                    const { embeds, components } = createPetPage(index);
                    return await interaction.editReply({ embeds, components });
                }

                if (customId === BACK_BUTTON_ID) {
                    return await interaction.editReply({ content: "Paki-type ulit ang `/help` para bumalik sa main menu (Iwas conflict error)." });
                }
            }
        } catch (error) {
            console.error('[CRITICAL ERROR]', error);
        }
    },
};
