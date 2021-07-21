import dotenv from 'dotenv';
import Discord from 'discord.js';

interface SAMPQueryPlayers {
  id: number,
  name: string,
  score: number,
  ping: number,
}

interface SAMPQuery {
  address: string,
  hostname: string,
  gamemode: string,
  mapname: string,
  passworded: boolean,
  maxplayers: number,
  online: number,
  rules: {
    lagcomp: boolean,
    mapname: string,
    version: string,
    weather: number,
    weburl: string,
    worldtime: string,
  },
  players: SAMPQueryPlayers[]
}

dotenv.config();

const {
  APP_LOOKUP_INTERVAL = 5000,
  SAMP_ADDRESS,
  SAMP_PORT,
  SAMP_LOOKUP_TIMEOUT = 3000,
  DISCORD_BOT_TOKEN,
} = process.env;

let hasError = false;

if (isNaN(APP_LOOKUP_INTERVAL as number)) {
  // tslint:disable-next-line: no-console
  console.error('APP_LOOKUP_INTERNAL must a number!');
  hasError = true;
}

if (isNaN(SAMP_LOOKUP_TIMEOUT as number)) {
  // tslint:disable-next-line: no-console
  console.error('SAMP_LOOKUP_TIMEOUT must a number!');
  hasError = true;
}

if (!SAMP_ADDRESS) {
  // tslint:disable-next-line: no-console
  console.error('SAMP_ADDRESS doesn\'t have value!');
  hasError = true;
}

if (!SAMP_PORT) {
  // tslint:disable-next-line: no-console
  console.error('SAMP_PORT doesn\'t have value!');
  hasError = true;
}

if (!DISCORD_BOT_TOKEN) {
  // tslint:disable-next-line: no-console
  console.error('DISCORD_BOT_TOKEN doesn\'t have value!');
  hasError = true;
}

if (hasError) {
  // tslint:disable-next-line: no-console
  console.error('App detected error. Please re-check the configuration!');
  process.exit(0);
}

// tslint:disable-next-line: no-var-requires
const samp = require('samp-query');

const client = new Discord.Client();

const setPresence = (): void => {
  samp({
    host: SAMP_ADDRESS,
    port: SAMP_PORT,
    timeout: SAMP_LOOKUP_TIMEOUT
  }, (err: Error, response: SAMPQuery) => {
    if (err) {
      // tslint:disable-next-line: no-console
      console.warn(`Error while lookup: ${err}`)
    } else {
      client.user?.setActivity({
        type: 'PLAYING',
        name: `with ${response.online} ${response.online < 2 ? 'player' : 'players'}!`,
      }).then(() => {
        setTimeout(() => setPresence(), APP_LOOKUP_INTERVAL as number);
      }).catch((e) => {
        // tslint:disable-next-line: no-console
        console.error(`An error occured while set presence: ${e}`);
        setTimeout(() => setPresence(), APP_LOOKUP_INTERVAL as number);
      });
    }
  })
};

client.login(DISCORD_BOT_TOKEN).then(async (value: string) => {
  // tslint:disable-next-line: no-console
  console.info('Logged in.');

  setPresence();
}).catch((reason: any) => {
  // tslint:disable-next-line: no-console
  console.warn(`Failed to login -> ${reason}`);
});
