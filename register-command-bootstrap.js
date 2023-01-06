/**
 * This script is used to bootstrap command registration.
 *
 * Each slash command needs to first be registered with Discord
 * before it can actually be used. This script registers a single
 * command, `/register`, that can then be used to register every
 * command loaded into the CommandManager.
 *
 * This script is not a part of JWBot, and should really only need
 * to be run once on first installation. Running command registration,
 * whether with this script or through the `/register` command, is
 * subject to rate limiting, so should only be done as necessary.
 */

import { default as config } from './credentials.json' assert { type: 'json' };
import { REST, Routes } from 'discord.js';
import { data as command } from './src/packages/jwbot/commands/register.js';

const rest = new REST({ version: '10' }).setToken(config.DISCORD.TOKEN);
(async () => {
    try {
        console.log('Registering the /register command.');
        const data = await rest.put(
            Routes.applicationCommands(config.DISCORD.CLIENT_ID),
            { body: [command] }
        );
        console.log(`Registered ${data.length} commands.`)
    } catch (err) {
        console.error(err);
    }
})();
