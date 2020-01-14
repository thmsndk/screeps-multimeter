// https://github.com/screepers/screepers-standards/blob/master/SS3-Unified_Credentials_File.md
// // const { ScreepsAPI } = require("screeps-api");
const  { list } = require("../src/blessed-util")
//const { SS3 } = require("screeps-ss3-ucf"); // TODO: a new npm package containing the appropiate methods to get the ss3 config details for other projects to use
const fs = require("fs");
const YAML = require("yamljs");
const { join } = require("path");
const Promise = require("bluebird");

Promise.promisifyAll(fs);

// TODO: we need to present a list of servers to select
// TODO: we need to store selected server in the multimeter config
// TODO: ability to select & connect to a new server?

const load = async (config = false, opts = {}) => {
  // const fromConfig = async (server = "main", config = false, opts = {}) => {
  const paths = [];
  if (process.env.SCREEPS_CONFIG) {
    paths.push(process.env.SCREEPS_CONFIG);
  }
  paths.push(join(__dirname, ".screeps.yaml"));
  paths.push(join(__dirname, ".screeps.yml"));
  paths.push("./.screeps.yaml");
  paths.push("./.screeps.yml");
  if (process.platform === "win32") {
    paths.push(join(process.env.APPDATA, "screeps/config.yaml"));
    paths.push(join(process.env.APPDATA, "screeps/config.yml"));
  } else {
    if (process.env.XDG_CONFIG_PATH) {
      paths.push(join(process.env.XDG_CONFIG_HOME, "screeps/config.yaml"));
      paths.push(join(process.env.XDG_CONFIG_HOME, "screeps/config.yml"));
    }
    if (process.env.HOME) {
      paths.push(join(process.env.HOME, ".config/screeps/config.yaml"));
      paths.push(join(process.env.HOME, ".config/screeps/config.yml"));
      paths.push(join(process.env.HOME, ".screeps.yaml"));
      paths.push(join(process.env.HOME, ".screeps.yml"));
    }
  }
  for (const path of paths) {
    const data = await readFile(path);
    if (data) {
      if (!data.servers) {
        throw new Error(
          `Invalid config: 'servers' object does not exist in '${path}'`,
        );
      }

      Object.entries(data.servers).forEach(([name, server]) => {
        server.protocol = server.secure ? "https" : "http";
        server.port = server.port || server.secure ? 433 : 21025;
      });
      const config = (data.configs && data.configs[config]) || {};

      return { servers: data.servers, config };
    }
  }
  throw new Error("No valid config found");
};
// // if (!data.servers[server]) {
// //   throw new Error(`Server '${server}' does not exist in '${path}'`);
// // }
// // const server = data.servers[server];
// //       const api = new ScreepsAPI(
// //         Object.assign(
// //           {
// //             hostname: server.host,
// //             port: server.port,
// //             protocol: server.secure ? "https" : "http",
// //             token: server.token,
// //           },
// //           opts,
// //         ),
// //       );
// // if (!conf.token && conf.username && conf.password) {
// //   await api.auth(conf.username, conf.password);
// // }

const readFile = async file => {
  try {
    const contents = await fs.readFileAsync(file, "utf8");
    return YAML.parse(contents);
  } catch (e) {
    if (e.code === "ENOENT") {
      return false;
    } else {
      throw e;
    }
  }
};





// parent: multimeter.screen, when we do list()

module.exports = async function(multimeter, nux) {
  const { servers, config } = await load("screeps-multimeter");
  if (nux) {
    nux.on("selectServer", async event => {
      // // console.log('test!!!!!')
      // // if (event.type === "log") {
        // //   event.line = parseLogJson(html2json(event.line));
        // //   event.formatted = true;
        // // }
        const items = Object.entries(servers).map(([name, server]) => name);
        
        if (!items.length) {
          return;
        }

        event.skip = true;

      event.promise = Promise.resolve(
        list(nux.screen, items),
        // listtable(nux.screen, servers, (item) => [item.]),
      ).then(name => {
        // // console.log(name);
        let config = event.config || []
        const server = servers[name];
        console.log(server);
        if (server) {
          Object.assign(
            config,
            {
              token: server.token,
              username: server.username,
              password: server.password,
              hostname: server.host,
              port: server.port,
              protocol: server.secure ? "https" : "http",
              shard: !server.token ? "shard0" : null
            },
          );
        }
        console.log(config)
        return config;
      });
      // .catch(err => console.log(err));
    });
  }
  // multimeter.console.on("addLines", function(event) {
  //   if (event.type === "log") {
  //     event.line = parseLogJson(html2json(event.line));
  //     event.formatted = true;
  //   }
  // });
};
