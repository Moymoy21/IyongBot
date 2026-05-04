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

const CATEGORY_ICONS = {
    Economy: "💰",
    Createboot: "🛍️",
    Core: "⚙️",
    Community: "👥",
    Birthday: "🎂",
    Fun: "🎮",
    Utility: "🛠️"
};

export async function createInitialHelpMenu(client) {
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
            const displayName = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
            const icon = CATEGORY_ICONS[displayName] || "🔍";
            return {
                label: `${icon} ${displayName}`,
                description: `Commands in ${displayName}`,
                value: category.toLowerCase(), // <--- FIX: Ginawang lowercase para mag-match sa shortcut
            };
        }),
    ];

    // Siguraduhin na isa lang ang 'createboot' option para iwas conflict
    const hasCreateBoot = options.some(opt => opt.value === 'createboot');
    if (!hasCreateBoot) {
        options.push({
            label: "🛍️ Createboot",
            description: "View and Edit Pets",
            value: "createboot"
        });
    }

    const embed = createEmbed({ 
        title: `${client?.user?.username || "Bot"} Help Center`,
        description: "Your all-in-one Discord companion for economy and management.",
        color: 'primary'
    });

    embed.addFields({
        name: "🛍️ **Create a Trading Boot**",
        value: "Show what you are selling or stocks\n\n" +
               "> `/MyBoot` - Check your own boot\n" +
               "> `/CreateListing` - Add items to sell\n" +
               "> `/PlayerBoot <username>` - Search for other player's boot",
        inline: false
    });

    embed.setFooter({ text: "Made with Iyong Official" });
    embed.setTimestamp();

    const bugReportButton = new ButtonBuilder()
        .setLabel('Report Bug')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/yourlink'); 

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
    },
};
