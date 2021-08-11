import dotenv from 'dotenv';
import Discord from 'discord.js';
import fetch from 'node-fetch';

interface RAGEMPServerInfo {
  name: string,
  gamemode: string,
  url: string,
  lang: string,
  players: number,
  peak: number,
  maxplayers: number
}

interface RAGEMPServerList {
  [key: string]: RAGEMPServerInfo;
}

export const init = (client?: Discord.Client): void => {
  dotenv.config();

  const {
    APP_LOOKUP_INTERVAL = 5000,
    RAGEMP_ADDRESS,
    RAGEMP_PORT,
    RAGEMP_LOOKUP_TIMEOUT = 15000,
    RAGEMP_UPDATE_TYPE,
    RAGEMP_UPDATE_CHANNEL_ID,
    RAGEMP_UPDATE_GUILD_ID,
    RAGEMP_DISCORD_BOT_TOKEN,
  } = process.env;

  let hasError = false;

  if (isNaN(APP_LOOKUP_INTERVAL as number)) {
    // tslint:disable-next-line: no-console
    console.error('APP_LOOKUP_INTERNAL must a number!');
    hasError = true;
  }

  if (!RAGEMP_ADDRESS) {
    // tslint:disable-next-line: no-console
    console.error('RAGEMP_ADDRESS doesn\'t have value!');
    hasError = true;
  }

  if (!RAGEMP_PORT) {
    // tslint:disable-next-line: no-console
    console.error('RAGEMP_PORT doesn\'t have value!');
    hasError = true;
  }

  if (!RAGEMP_UPDATE_TYPE) {
    // tslint:disable-next-line: no-console
    console.error('RAGEMP_UPDATE_TYPE doesn\'t have value!');
    hasError = true;
  }

  if (RAGEMP_UPDATE_TYPE === 'channel' && !RAGEMP_UPDATE_GUILD_ID) {
    // tslint:disable-next-line: no-console
    console.error('RAGEMP_UPDATE_GUILD_ID doesn\'t have value!');
    hasError = true;
  }

  if (RAGEMP_UPDATE_TYPE === 'channel' && !RAGEMP_UPDATE_CHANNEL_ID) {
    // tslint:disable-next-line: no-console
    console.error('RAGEMP_UPDATE_CHANNEL_ID doesn\'t have value!');
    hasError = true;
  }

  if (!client && !RAGEMP_DISCORD_BOT_TOKEN) {
    // tslint:disable-next-line: no-console
    console.error('RAGEMP_DISCORD_BOT_TOKEN doesn\'t have value!');
    hasError = true;
  }

  if (hasError) {
    // tslint:disable-next-line: no-console
    console.error('App detected error. Please re-check the configuration!');
    process.exit(0);
  }

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
    console.info(`${y}-${M}-${d} ${h}:${m}:${s} [RAGEMP] ${message}`);
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
      String(RAGEMP_UPDATE_GUILD_ID)
    ).then((guild: Discord.Guild) => {
      if (!guild) {
        throw Error('Guild not found');
      }

      const fetchedChannel = guild.channels.resolve(String(RAGEMP_UPDATE_CHANNEL_ID));

      if (!fetchedChannel) {
        throw Error('Channel not found');
      }

      return fetchedChannel.setName(`RAGEMP : ${numberOfPlayers} / ${maxPlayers}`);
    }).then(() => {
      printLog('update channel success');
      setTimeout(() => lookupServer(), APP_LOOKUP_INTERVAL as number);
    }).catch((e) => {
      printLog(`Error while update channel name: ${e}`)
      setTimeout(() => lookupServer(), APP_LOOKUP_INTERVAL as number);
    });
  };

  const updateStats = (numberOfPlayers: number, maxPlayers: number): void => {
    switch (RAGEMP_UPDATE_TYPE) {
      case 'channel': {
        updateChannelName(numberOfPlayers, maxPlayers);
        break;
      }
      case 'presence': {
        updatePresence(numberOfPlayers, maxPlayers);
        break;
      }
      default: {
        printLog(`Unknown RAGEMP_UPDATE_TYPE. Found: ${RAGEMP_UPDATE_TYPE}`);
        break;
      }
    }
  }

  const filterServers = (servers: RAGEMPServerList): void => {
    const serverString = `${RAGEMP_ADDRESS}:${RAGEMP_PORT}`;
    const server = servers[serverString];

    if (!server) {
      printLog(`Server not found. Config: ${serverString}`);
      setTimeout(() => lookupServer(), APP_LOOKUP_INTERVAL as number);
    } else {
      updateStats(server.players, server.maxplayers);
    }
  };

  const lookupServer = (): void => {
    fetch('https://cdn.rage.mp/master/', {
      timeout: Number(RAGEMP_LOOKUP_TIMEOUT),
      method: 'GET',
    }).then((response) => response.json())
      .then((servers: RAGEMPServerList) => {
        filterServers(servers);
      })
      .catch((e) => {
        printLog(`Error while fetch RAGEMP masterlist: ${e}`);
        setTimeout(() => lookupServer(), APP_LOOKUP_INTERVAL as number);
      });
  }

  setTimeout(() => {
    if (client) {
      currentClient = client;
      lookupServer();
    } else {
      currentClient.login(RAGEMP_DISCORD_BOT_TOKEN).then(async () => {
        printLog('Logged in.');
        lookupServer();
      }).catch((reason: any) => {
        printLog(`Failed to login -> ${reason}`);
      });
    }
  }, 2000);
};
