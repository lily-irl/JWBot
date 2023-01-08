import { Client, Events, GatewayIntentBits } from "discord.js";
import { default as config } from "../credentials.json" assert { type: 'json' };
import Bot from "./core/Bot.js";

/**
 * Application entry point
 */
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildBans, GatewayIntentBits.GuildMembers ]})

client.once(Events.ClientReady, c => {
    const bot = new Bot(client);
});

client.login(config.DISCORD.TOKEN);
