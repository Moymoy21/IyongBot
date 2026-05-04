import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from "discord.js";
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from "../../utils/embeds.js";
import { createSelectMenu } from "../../utils/components.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_SELECT_ID = "help-category-select";
const ALL_COMMANDS_ID = "help-all-commands";
const HELP_MENU_TIMEOUT_MS = 5 * 60 * 1000;

const CATEGORY_ICONS = {
    Economy: "💰",
    CreateBoot: "🛍️",
};

export async function createInitialHelpMenu(client) {
    // 1. Safety Check para sa folders
    let categoryDirs = [];
    try {
        const commandsPath = path.join(__dirname, "../../commands");
        categoryDirs = (await fs.readdir(commandsPath, { withFileTypes: true }))
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .sort();
    } catch (e) {
        console.error("Error reading commands directory:", e);
    }

    const options = [
        {
            label: "📋 All Commands",
            description: "View all available commands",
            value: ALL_COMMANDS_ID,
        },
        ...categoryDirs.map((category) => {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
            const icon = CATEGORY_ICONS[categoryName] || "🔍";
            return {
                label: `${icon} ${categoryName}`,
                description: `Commands in ${categoryName}`,
                value: category,
            };
        }),
    ];

    const embed = createEmbed({ 
        title: `${client?.user?.username || "Bot"} Help Center`,
        description: "Your all-in-one Discord companion for economy and management.",
        color: 'primary'
    });

    embed.addFields({
        name: "🛍️ **Create a Trading Boot**",
        value: "Show what you are selling or stocks",
        inline: true
    });

    // 2. FIXED: Define the buttons properly
    const bugReportButton = new ButtonBuilder()
        .setLabel('Report Bug')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/yourlink'); // Palitan mo ng link mo

    const selectRow = createSelectMenu(
        CATEGORY_SELECT_ID,
        "Select a category",
        options,
    );

    const buttonRow = new ActionRowBuilder().addComponents(bugReportButton);

    return {
        embeds: [embed],
        components: [buttonRow, selectRow],
    };
}

export default {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Displays the help menu"),

    async execute(interaction, guildConfig, client) {
        await InteractionHelper.safeDefer(interaction);
        
        try {
            const { embeds, components } = await createInitialHelpMenu(client);
            await InteractionHelper.safeEditReply(interaction, {
                embeds,
                components,
            });
        } catch (error) {
            console.error(error);
            await InteractionHelper.safeEditReply(interaction, {
                content: "May error sa pag-load ng help menu.",
                embeds: [],
                components: []
            });
        }

        setTimeout(async () => {
            try {
                const closedEmbed = createEmbed({
                    title: "Help menu closed",
                    description: "Use /help again to see the menu.",
                    color: "error",
                });
                await InteractionHelper.safeEditReply(interaction, {
                    embeds: [closedEmbed],
                    components: [],
                });
            } catch (error) {}
        }, HELP_MENU_TIMEOUT_MS);
    },
};
