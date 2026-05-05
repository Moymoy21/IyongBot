import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Routes } from 'discord.js';
import { REST } from '@discordjs/rest';
import express from 'express';
import cron from 'node-cron';

import config from './config/application.js';
import { initializeDatabase } from './utils/database.js';
import { getGuildConfig } from './services/guildConfig.js';
import { getServerCounters, saveServerCounters, updateCounter } from './services/serverstatsService.js';
import { logger, startupLog, shutdownLog } from './utils/logger.js';
import { checkBirthdays } from './services/birthdayService.js';
import { checkGiveaways } from './services/giveawayService.js';
import { loadCommands, registerCommands as registerSlashCommands } from './handlers/commandLoader.js';

class TitanBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,                        
        GatewayIntentBits.GuildMembers,                 
        GatewayIntentBits.GuildMessages,                
        GatewayIntentBits.GuildMessageReactions,        
        GatewayIntentBits.MessageContent,               
        GatewayIntentBits.GuildVoiceStates,             
        GatewayIntentBits.GuildBans,                    
      ],
    });

    this.config = config;
    this.commands = new Collection();
    this.events = new Collection();
    this.buttons = new Collection();
    this.selectMenus = new Collection();
    this.modals = new Collection();
    this.cooldowns = new Collection();
    this.db = null;
    this.rest = new REST({ version: '10' }).setToken(config.bot.token);
  }

  async start() {
    try {
      startupLog('Starting TitanBot...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      startupLog('Initializing database...');
      const dbInstance = await initializeDatabase();
      this.db = dbInstance.db;
      
      const dbStatus = this.db.getStatus();
      if (dbStatus.isDegraded) {
        logger.warn('');
        logger.warn('╔═══════════════════════════════════════════════════════╗');
        logger.warn('║ ⚠️  DATABASE RUNNING IN DEGRADED MODE                 ║');
        logger.warn('║                                                       ║');
        logger.warn('║ Connection: In-Memory Storage (PostgreSQL unavailable)║');
        logger.warn('║ Data Persistence: DISABLED - data lost on restart    ║');
        logger.warn('║ Action Required: Fix PostgreSQL and restart bot      ║');
        logger.warn('╚═══════════════════════════════════════════════════════╝');
        logger.warn('');
      } else {
        startupLog(`✅ Database Status: ${dbStatus.connectionType} (fully operational)`);
      }
      
      startupLog('Starting web server...');
      this.startWebServer();
      
      startupLog('Loading commands...');
      await loadCommands(this);
      startupLog(`Commands loaded: ${this.commands.size}`);
      
      startupLog('Loading handlers...');
      await this.loadHandlers();
      startupLog('Handlers loaded');
      
      startupLog('Logging into Discord...');
      await this.login(this.config.bot.token);
      startupLog('Discord login successful');
      
      startupLog('Registering slash commands...');
      await this.registerCommands(); // Gagamitin ang bagong logic sa ibaba
      startupLog('Slash commands registration complete');
      
      const databaseMode = dbStatus.isDegraded
        ? 'Optional in-memory mode (data resets after restart)'
        : 'Connected (persistent data enabled)';
      const handlerSummary = `${this.buttons.size} buttons, ${this.selectMenus.size} menus, ${this.modals.size} modals`;
      startupLog(
        `ONLINE ✅ | ${this.commands.size} commands loaded | ${handlerSummary} | Database: ${databaseMode}`
      );
      
      this.setupCronJobs();
    } catch (error) {
      logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  async registerCommands() {
    try {
      startupLog('🔄 Resetting Slash Commands (PUT mode)...');
      
      // I-convert ang loaded commands (/help at /boot) sa JSON
      const commandData = this.commands.map(cmd => cmd.data.toJSON());

      // I-overwrite ang lahat ng commands sa Discord API para matanggal ang mga multo na commands
      await this.rest.put(
        Routes.applicationCommands(this.config.bot.clientId),
        { body: commandData }
      );
      
      startupLog(`✅ Global commands synchronized. Active: ${commandData.length}`);
    } catch (error) {
      logger.error('❌ Error registering slash commands:', error);
    }
  }

  startWebServer() {
    const app = express();
    const configuredPort = Number(this.config.api?.port || process.env.PORT || 3000);
    const host = process.env.WEB_HOST || '0.0.0.0';
    
    app.get('/', (req, res) => {
      res.status(200).json({ message: 'TitanBot Online', version: '2.0.0' });
    });

    app.listen(configuredPort, host, () => {
      startupLog(`✅ Web Server running on ${host}:${configuredPort}`);
    });
  }

  setupCronJobs() {
    cron.schedule('0 6 * * *', () => checkBirthdays(this));
    cron.schedule('* * * * *', () => checkGiveaways(this));
    cron.schedule('*/15 * * * *', () => this.updateAllCounters());
  }

  async updateAllCounters() {
    if (!this.db) return;
    for (const [guildId, guild] of this.guilds.cache) {
      try {
        const counters = await getServerCounters(this, guildId);
        for (const counter of counters) {
          if (counter?.channelId) await updateCounter(this, guild, counter);
        }
      } catch (error) {
        logger.error(`Error updating counters for guild ${guildId}:`, error);
      }
    }
  }

  async loadHandlers() {
    const handlers = [
      { path: 'events', type: 'default', required: true },
      { path: 'interactions', type: 'default', required: true }
    ];

    for (const handler of handlers) {
      try {
        const module = await import(`./handlers/${handler.path}.js`);
        const loaderFn = module.default;
        if (typeof loaderFn === 'function') await loaderFn(this);
      } catch (error) {
        logger.error(`❌ Failed to load ${handler.path}:`, error.message);
      }
    }
  }

  async shutdown(reason = 'UNKNOWN') {
    shutdownLog(`Bot is shutting down (${reason})...`);
    try {
      cron.getTasks().forEach(task => task.stop());
      if (this.isReady()) this.destroy();
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  }
}

const bot = new TitanBot();
process.on('SIGTERM', () => bot.shutdown('SIGTERM'));
process.on('SIGINT', () => bot.shutdown('SIGINT'));
bot.start();

export default TitanBot;
          
