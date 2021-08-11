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

export const init = (client?: Discord.Client): void => {
  dotenv.config();

  const {
    APP_LOOKUP_INTERVAL = 5000,
    SAMP_ADDRESS,
    SAMP_PORT,
    SAMP_LOOKUP_TIMEOUT = 3000,
    SAMP_UPDATE_TYPE,
    SAMP_UPDATE_CHANNEL_ID,
    SAMP_UPDATE_GUILD_ID,
    SAMP_DISCORD_BOT_TOKEN,
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

  if (!SAMP_UPDATE_TYPE) {
    // tslint:disable-next-line: no-console
    console.error('SAMP_UPDATE_TYPE doesn\'t have value!');
    hasError = true;
  }

  if (SAMP_UPDATE_TYPE === 'channel' && !SAMP_UPDATE_GUILD_ID) {
    // tslint:disable-next-line: no-console
    console.error('SAMP_UPDATE_GUILD_ID doesn\'t have value!');
    hasError = true;
  }

  if (SAMP_UPDATE_TYPE === 'channel' && !SAMP_UPDATE_CHANNEL_ID) {
    // tslint:disable-next-line: no-console
    console.error('SAMP_UPDATE_CHANNEL_ID doesn\'t have value!');
    hasError = true;
  }

  if (!client && !SAMP_DISCORD_BOT_TOKEN) {
    // tslint:disable-next-line: no-console
    console.error('SAMP_DISCORD_BOT_TOKEN doesn\'t have value!');
    hasError = true;
  }

  if (hasError) {
    // tslint:disable-next-line: no-console
    console.error('App detected error. Please re-check the configuration!');
    process.exit(0);
  }

  // tslint:disable-next-line: no-var-requires
  const samp = require('samp-query');

  let currentClient = new Discord.Client();

  const printLog = (message: string): void => {
    const now = new Date();
    const [ d, M, y, h, m, s ] = [
      now.getDate(),
      now.getMonth(),
      now.getFullYear(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
    ];

    // tslint:disable-next-line: no-console
    console.info(`${y}-${M}-${d} ${h}:${m}:${s} [SA-MP] ${message}`);
  }

  const updatePresence = (numberOfPlayers: number, maxPlayers: number): void => {
    currentClient.user?.setActivity({
      type: 'PLAYING',
      name: `with ${numberOfPlayers} ${numberOfPlayers < 2 ? 'player' : 'players'}! | Slot: ${maxPlayers} players`,
    }).then(() => {
      printLog('set presence success');
      setTimeout(() => lookupServer(), APP_LOOKUP_INTERVAL as number);
    }).catch((e) => {
      printLog(`An error occured while set presence: ${e}`);
      setTimeout(() => lookupServer(), APP_LOOKUP_INTERVAL as number);
    });
  };

  const updateChannelName = (numberOfPlayers: number, maxPlayers: number): void => {
    currentClient.guilds.fetch(
      String(SAMP_UPDATE_GUILD_ID)
    ).then((guild: Discord.Guild) => {
      if (!guild) {
        throw Error('Guild not found');
      }

      const fetchedChannel = guild.channels.cache.find(
        (channel: Discord.Channel) => (channel.id === SAMP_UPDATE_CHANNEL_ID)
      );

      if (!fetchedChannel) {
        throw Error('Channel not found');
      }

      return fetchedChannel.setName(`SA-MP : ${numberOfPlayers} / ${maxPlayers}`);
    }).then(() => {
      printLog('update channel success');
      setTimeout(() => lookupServer(), APP_LOOKUP_INTERVAL as number);
    }).catch((e) => {
      printLog(`Error while update channel name: ${e}`)
      setTimeout(() => lookupServer(), APP_LOOKUP_INTERVAL as number);
    });
  };

  const updateStats = (numberOfPlayers: number, maxPlayers: number): void => {
    switch (SAMP_UPDATE_TYPE) {
      case 'channel': {
        updateChannelName(numberOfPlayers, maxPlayers);
        break;
      }
      case 'presence': {
        updatePresence(numberOfPlayers, maxPlayers);
        break;
      }
      default: {
        printLog(`Unknown SAMP_UPDATE_TYPE. Found: ${SAMP_UPDATE_TYPE}`);
        break;
      }
    }
  }

  const lookupServer = (): void => {
    samp({
      host: SAMP_ADDRESS,
      port: SAMP_PORT,
      timeout: SAMP_LOOKUP_TIMEOUT
    }, (err: Error, response: SAMPQuery) => {
      if (err) {
        printLog(`Error while lookup: ${err}`)
        setTimeout(() => lookupServer(), APP_LOOKUP_INTERVAL as number);
      } else {
        updateStats(response.online, response.maxplayers);
      }
    });
  }

  setTimeout(() => {
    if (client) {
      currentClient = client;
      lookupServer();
    } else {
      currentClient.login(SAMP_DISCORD_BOT_TOKEN).then(async () => {
        printLog('Logged in.');
        lookupServer();
      }).catch((reason: any) => {
        printLog(`Failed to login -> ${reason}`);
      });
    }
  }, 2000);
};
