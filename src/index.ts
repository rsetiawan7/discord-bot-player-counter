import Discord from 'discord.js'
import dotenv from 'dotenv';
import { init as initRAGEMP } from './game/ragemp'
import { init as initSAMP } from './game/samp'

const validArgs: string[] = ['all', 'ragemp', 'samp'];

if (!validArgs.includes(process.argv[2])) {
  // tslint:disable-next-line: no-console
  console.error(`Unrecognized arguments. Expected: ${validArgs.join(', ')}`);
  process.exit(0);
}

const client: Discord.Client = new Discord.Client();

dotenv.config();

const {
  APP_DISCORD_BOT_TOKEN
} = process.env;

const initApp = (singleClient: boolean) => {
  if (singleClient) {
    if (process.argv[2] === 'all') {
      initRAGEMP(client);
      initSAMP(client);
    } else if (process.argv[2] === 'ragemp') {
      initRAGEMP(client);
    } else if (process.argv[2] === 'samp') {
      initSAMP(client);
    }
  } else {
    if (process.argv[2] === 'all') {
      initRAGEMP();
      initSAMP();
    } else if (process.argv[2] === 'ragemp') {
      initRAGEMP();
    } else if (process.argv[2] === 'samp') {
      initSAMP();
    }
  }
};

if (APP_DISCORD_BOT_TOKEN) {
  client.login(APP_DISCORD_BOT_TOKEN).then(async () => {
    // tslint:disable-next-line: no-console
    console.info('[APP] Logged in.');
    initApp(true);
  }).catch((reason: any) => {
    // tslint:disable-next-line: no-console
    console.warn(`Failed to login -> ${reason}`);
  });
} else {
  initApp(false);
}
