// https://github.com/screepers/screepers-standards/blob/master/SS3-Unified_Credentials_File.md
const { ScreepsAPI } = require("screeps-api");
const blessed = require("blessed");

//const { SS3 } = require("screeps-ss3-ucf"); // TODO: a new npm package containing the appropiate methods to get the ss3 config details for other projects to use
const fs = require("fs");
const YAML = require("yamljs");
const { join } = require("path");
const Promise = require("bluebird");

Promise.promisifyAll(fs);

// we need to present a list of servers to select
// we need to store selected server in the multimeter config

const fromConfig = async (server = "main", config = false, opts = {}) => {
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
    const data = await loadConfig(path);
    if (data) {
      if (!data.servers) {
        throw new Error(
          `Invalid config: 'servers' object does not exist in '${path}'`,
        );
      }
      if (!data.servers[server]) {
        throw new Error(`Server '${server}' does not exist in '${path}'`);
      }
      const conf = data.servers[server];
      const api = new ScreepsAPI(
        Object.assign(
          {
            hostname: conf.host,
            port: conf.port,
            protocol: conf.secure ? "https" : "http",
            token: conf.token,
          },
          opts,
        ),
      );
      api.appConfig = (data.configs && data.configs[config]) || {};
      if (!conf.token && conf.username && conf.password) {
        await api.auth(conf.username, conf.password);
      }
      return api;
    }
  }
  throw new Error("No valid config found");
};

const loadConfig = async file => {
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

function list(screen, items) {
  let index = 0;
  // Create a box perfectly centered horizontally and vertically.
  var list = blessed.list({
    parent: screen,
    align: "center",
    mouse: true,
    width: "50%",
    height: "50%",
    top: "center",
    left: "center",
    selectedBg: "green",
    items: items /*[
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten"
  ]*/,
    tags: true,
    keys: true,
    vi: true,
  });
  // list.select(0);
  screen.render();

  // // list.prepend(
  // //   blessed.text({
  // //     left: 2,
  // //     content: " My list ",
  // //   }),
  // // );

  // // list.on("keypress", function(ch, key) {
  // //   if (key.name === "up" || key.name === "k") {
  // //     index++;
  // //     list.up();
  // //     screen.render();
  // //     return;
  // //   } else if (key.name === "down" || key.name === "j") {
  // //     index--;
  // //     list.down();
  // //     screen.render();
  // //     return;
  // //   } else if (key.name === "return") {
  // //     console.log(`return? ${index} ${list.get}`)
  // //     list.select(index);
  // //     list.getLine()
  // //   }
  // //   // // else {
  // //   // //   console.log(key.name)
  // //   // // }
  // // });

  return new Promise((resolve, reject) => {
    list.on("select", function(item) {
      const value = item.content
      console.log(`${value} selected`);
      list.destroy()
      resolve(value);
    });

    list.on("cancel ", function(value) {
      console.log(`rejected`);
      reject(new Error("cancel"));
    });
  });
}

// parent: multimeter.screen, when we do list()

module.exports = function(multimeter, nux) {
  if (nux) {
    nux.on("selectServer", function(event) {
      event.skip = true;
      // // console.log('test!!!!!')
      // // if (event.type === "log") {
      // //   event.line = parseLogJson(html2json(event.line));
      // //   event.formatted = true;
      // // }
      event.promise = Promise.resolve(
        list(nux.screen, [
          "one",
          "two",
          "three",
          "four",
          "five",
          "six",
          "seven",
          "eight",
          "nine",
          "ten",
        ]),
      )
        .then(server => console.log(server))
        .catch(err => console.log(err));
    });
  }
  // multimeter.console.on("addLines", function(event) {
  //   if (event.type === "log") {
  //     event.line = parseLogJson(html2json(event.line));
  //     event.formatted = true;
  //   }
  // });
};

let parseLogJson = function(obj) {
  let ret = "",
    bgColor,
    color,
    bold,
    underline;

  if (obj.attr && obj.attr.style) {
    let i = obj.attr.style.indexOf("color:");
    if (i !== -1) {
      color = `${obj.attr.style[i + 1].replace(/;/g, "")}-fg`;
    }

    i = obj.attr.style.indexOf("background:");
    if (i !== -1) {
      bgColor = `${obj.attr.style[i + 1].replace(/;/g, "")}-bg`;
    }

    i = obj.attr.style.indexOf("font-weight:");
    if (i !== -1) {
      bold = `${obj.attr.style[i + 1].replace(/;/g, "")}`;
    }

    i = obj.attr.style.indexOf("text-decoration:");
    if (i !== -1) {
      underline = `${obj.attr.style[i + 1].replace(/;/g, "")}`;
    }
  }

  if (obj.text) {
    ret = obj.text;
  }
  if (obj.child) {
    ret = obj.child.reduce(function(acc, child) {
      acc = acc + parseLogJson(child);
      return acc;
    }, ret);
  }

  if (bold) {
    ret = `{${bold}}${ret}{/${bold}}`;
  }

  if (underline) {
    ret = `{${underline}}${ret}{/${underline}}`;
  }

  if (color) {
    ret = `{${color}}${ret}{/${color}}`;
  }

  if (bgColor) {
    ret = `{${bgColor}}${ret}{/${bgColor}}`;
  }

  return ret;
};
