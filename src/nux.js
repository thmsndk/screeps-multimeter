const _ = require("lodash");
const blessed = require("blessed");
const configManager = require("./config_manager");
const { BUILTIN_PLUGINS } = require("./plugins");
const require_relative = require("require-relative");
const EventEmitter = require("events");
const DIALOG_LABEL = " {blue-fg}Multimeter Config{/blue-fg} ";

const CONFIG_DEFAULTS = {
  plugins: [],
};

function promiseFinally(promise, handler) {
  return promise.then(
    res => Promise.resolve(handler()).then(() => res),
    err =>
      Promise.resolve(handler()).then(() => {
        throw err;
      }),
  );
}

function message(screen, message) {
  var msg = blessed.message({
    parent: screen,
    border: "line",
    height: "shrink",
    width: "half",
    top: "center",
    left: "center",
    label: DIALOG_LABEL,
    tags: true,
    keys: true,
    hidden: true,
    vi: true,
  });

  return new Promise((resolve, reject) => {
    msg.display(message, 0, function(err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function prompt(screen, question, value) {
  var prompt = blessed.prompt({
    parent: screen,
    border: "line",
    height: "shrink",
    width: "half",
    top: "center",
    left: "center",
    label: DIALOG_LABEL,
    tags: true,
    keys: true,
    vi: true,
  });

  return new Promise((resolve, reject) => {
    prompt.input(question, value || "", function(err, value) {
      if (err) reject(err);
      else if (value) resolve(value);
      else reject(new Error("No answer"));
    });
  });
}

module.exports = class Nux extends EventEmitter {
  constructor(configManager) {
    super();
    this.configManager = configManager;
  }

  loadPlugins() {
    _.each(BUILTIN_PLUGINS, async name => {
      const module = require(name);
      try {
        await module(null, this);
      } catch (error) {
        console.log(`${name} was not written to support nux events`);
      }
    });
    // .plugins does not exist yet
    // // _.each(this.config.plugins, name => {
    // //   const module = require_relative(name, this.configManager.filename);
    // //   try {
    // //     module(null, this);
    // //   } catch (error) {
    // //     console.log(`${name} was not written to support nux events`)
    // //   }
    // // });
  }

  run() {
    const screen = (this.screen = blessed.screen({
      smartCSR: true,
      ignoreLocked: ["C-c"],
      autoPadding: true,
    }));

    this.loadPlugins();

    var canceled = new Promise((resolve, reject) => {
      screen.key("C-c", () => setTimeout(reject, 100, new Error("Canceled")));
    });

    var promise = Promise.resolve(
      message(
        screen,
        "No config file was found, so I will now create one. Press ^C to exit or any other key to continue.",
      ),
    )
      .then(config => {
        const event = { config };
        this.emit("selectServer", event);
        if (event.skip) {
          // // console.log('skip')
          if (event.promise) {
            // // console.log('we got a promise')
            return event.promise;
          }
          // // console.log('no promise')
          return config;
        }

        return prompt(
          screen,
          "Enter your screeps API token (leave blank to connect to a private server):",
        ).then(
          token => Object.assign({ token }, config),
          () =>
            prompt(screen, "Enter the hostname for the server (without port):")
              .then(hostname => Object.assign({ hostname }, config))
              .then(config =>
                prompt(screen, "Enter the port for the server:").then(port =>
                  Object.assign({ port }, config),
                ),
              )
              .then(config =>
                prompt(screen, "Enter your username or email:").then(username =>
                  Object.assign({ username }, config),
                ),
              )
              .then(config =>
                prompt(screen, "Enter your password:").then(password =>
                  Object.assign({ password }, config),
                ),
              ),
        );
      })
      .then(config => {
        // TODO: emit event, check for skip
        // TODO: could make an api call to get shard list
        return prompt(screen, "Enter shard name:", "shard0").then(shard =>
          Object.assign({ shard }, config),
        );
      })
      .then(config =>
        prompt(
          screen,
          "Enter a filename for configuration:",
          "screeps-multimeter.json",
        ).then(filename => [filename, config]),
      )
      .then(([filename, config]) => {
        config = Object.assign(config, CONFIG_DEFAULTS);
        configManager.config = config;
        return configManager
          .saveConfig(filename)
          .then(() => [filename, config]);
      });

    return promiseFinally(Promise.race([promise, canceled]), () => {
      screen.destroy();
    });
  }
};
