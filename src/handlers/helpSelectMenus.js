import { createEmbed } from '../utils/embeds.js';
import { createButton, getPaginationRow } from '../utils/components.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Collection, ActionRowBuilder, MessageFlags } from 'discord.js';
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

const CATEGORY_ICONS = {
    Economy: "💰",
    Createboot: "🛍️", // Siguraduhing tugma ang capitalization
    Utility: "🛠️"
};

const ALLOWED_CATEGORIES = ["economy", "createboot", "utility"];

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
            entries.push({
                baseName,
                displayName: `${baseName} ${option.name}`,
                description: option.description || baseDescription,
                category,
            });
            continue;
        }
        if (option.type === SUBCOMMAND_GROUP_TYPE) {
            const nestedOptions = option.options || [];
            for (const nested of nestedOptions) {
                if (nested?.type !== SUBCOMMAND_TYPE) continue;
                entries.push({
                    baseName,
                    displayName: `${baseName} ${option.name} ${nested.name}`,
                    description: nested.description || option.description || baseDescription,
                    category,
                });
            }
        }
    }

    if (entries.length === 0) {
        entries.push({
            baseName,
            displayName: baseName,
            description: baseDescription,
            category,
        });
    }
    return entries;
}

function normalizeCommandData(command) {
    const rawData = command?.data;
    if (!rawData) return null;
    const jsonData = typeof rawData.toJSON === 'function' ? rawData.toJSON() : rawData;
    if (!jsonData?.name) return null;
    return {
        ...jsonData,
        options: Array.isArray(jsonData.options) ? jsonData.options.map((opt) => typeof opt?.toJSON === 'function' ? opt.toJSON() : opt) : [],
    };
}

async function createCategoryCommandsMenu(category, client) {
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    
    // --- SPECIAL CASE PARA SA CREATEBOOT (PET LIST) ---
    if (category.toLowerCase() === 'createboot') {
        const petList = [
            "https://static.wikia.nocookie.net/growagarden/images/3/3c/Dilophosaurus.png/revision/latest?cb=20250712071322",
            "https://link-to-pet-image-2.png",
            "https://link-to-pet-image-3.png"
            // Dagdagan mo lang dito ang links mo
        ];

        const formattedList = petList.map((link, index) => `**${index + 1}** ${link}`).join('\n');

        const embed = createEmbed({
            title: "🐾 Pet List Selection",
            description: `Mangyaring pumili ng pet sa listahan:\n\n${formattedList}`,
            color: 'primary'
        });

        embed.setFooter({ text: FOOTER_TEXT });
        embed.setTimestamp();

        const backButton = createButton(BACK_BUTTON_ID, "Back", "primary", "⬅️", false);
        return { embeds: [embed], components: [new ActionRowBuilder().addComponents(backButton)] };
    }
    // --- END OF SPECIAL CASE ---

    const icon = CATEGORY_ICONS[categoryName] || "🔍";
    const categoryCommands = [];

    try {
        const categoryPath = path.join(__dirname, "../commands", category);
        const commandFiles = (await fs.readdir(categoryPath)).filter((file) => file.endsWith(".js")).sort();

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);
            const commandModule = await import(`file://${filePath}`);
            const command = commandModule.default;
            const commandData = normalizeCommandData(command);

            if (commandData) {
                if (commandData.name === "help" || commandData.name === "commandlist") continue;
                categoryCommands.push(...buildHelpEntries(command, categoryName));
            }
        }
    } catch (error) {
        logger.error(`Error reading commands from ${category}:`, error);
    }

    categoryCommands.sort((a, b) => a.displayName.localeCompare(b.displayName));
    let registeredCommands = new Collection();
    try {
        if (client?.application?.commands?.fetch) {
            const commands = await client.application.commands.fetch();
            for (const cmd of commands.values()) registeredCommands.set(cmd.name, cmd);
        }
    } catch (error) {}

    const embed = createEmbed({
        title: `${icon} ${categoryName} Commands`,
        description: categoryCommands.length > 0 ? `List of commands in ${categoryName}:` : `No commands found.`,
        color: 'primary'
    });

    if (categoryCommands.length > 0) {
        const commandMentions = categoryCommands.map((cmd) => {
            const registeredCmd = registeredCommands.get(cmd.baseName);
            if (registeredCmd && registeredCmd.id) {
                return `</${cmd.displayName}:${registeredCmd.id}> · ${cmd.description}`;
            }
            return `\`/${cmd.displayName}\` · ${cmd.description}`;
        }).join("\n");

        embed.addFields({ name: "Commands", value: commandMentions.substring(0, 1024), inline: false });
    }

    embed.setFooter({ text: FOOTER_TEXT });
    embed.setTimestamp();

    const backButton = createButton(BACK_BUTTON_ID, "Back", "primary", "⬅️", false);
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(backButton)] };
}

export async function createAllCommandsMenu(page = 1, client) {
    const commandsPerPage = 20;
    const allCommands = [];

    const commandsPath = path.join(__dirname, "../commands");
    const categoryDirs = (await fs.readdir(commandsPath, { withFileTypes: true }))
        .filter((dirent) => dirent.isDirectory() && ALLOWED_CATEGORIES.includes(dirent.name.toLowerCase()))
        .map((dirent) => dirent.name)
        .sort();

    for (const category of categoryDirs) {
        try {
            const categoryPath = path.join(__dirname, "../commands", category);
            const commandFiles = (await fs.readdir(categoryPath)).filter((file) => file.endsWith(".js"));
            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                const commandModule = await import(`file://${filePath}`);
                const commandData = normalizeCommandData(commandModule.default);
                if (commandData && commandData.name !== "help") {
                    allCommands.push(...buildHelpEntries(commandModule.default, category));
                }
            }
        } catch (error) {}
    }

    const totalPages = Math.ceil(allCommands.length / commandsPerPage);
    const pageCommands = allCommands.slice((page - 1) * commandsPerPage, page * commandsPerPage);

    const embed = createEmbed({ title: "📋 All Commands", description: `Viewing page ${page} of ${totalPages}` });
    
    if (pageCommands.length > 0) {
        const list = pageCommands.map(cmd => `\`/${cmd.displayName}\` - ${cmd.description}`).join('\n');
        embed.addFields({ name: "Commands", value: list.substring(0, 1024) });
    }

    embed.setFooter({ text: FOOTER_TEXT });
    const components = [new ActionRowBuilder().addComponents(createButton(BACK_BUTTON_ID, "Back", "primary", "⬅️", false))];
    if (totalPages > 1) components.unshift(getPaginationRow(PAGINATION_PREFIX, page, totalPages));

    return { embeds: [embed], components };
}

export const helpCategorySelectMenu = {
    name: CATEGORY_SELECT_ID,
    async execute(interaction, client) {
        try {
            await interaction.deferUpdate();
            const selected = interaction.values[0];
            const { embeds, components } = selected === ALL_COMMANDS_ID 
                ? await createAllCommandsMenu(1, client) 
                : await createCategoryCommandsMenu(selected, client);
            
            await interaction.editReply({ embeds, components });
        } catch (error) {
            logger.error('Error in help select menu:', error);
        }
    },
};
