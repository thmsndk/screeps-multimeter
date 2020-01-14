const blessed = require("blessed");

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
    items: items,
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
      const value = item.content;
      list.destroy();
      resolve(value);
    });

    list.on("cancel ", function(value) {
      reject(new Error("cancel"));
    });
  });
}

function listtable(screen, items, row) {
  let index = 0;
  // Create a box perfectly centered horizontally and vertically.
  var table = blessed.listtable({
    parent: screen,
    align: "center",
    mouse: true,
    width: "50%",
    height: "50%",
    top: "center",
    left: "center",
    selectedBg: "green",
    // // items: items,
    tags: true,
    keys: true,
    vi: true,
  });

  table.setData(
    Object.entries(items).map(([server, data]) => row(server, item)),
  );

  table.focus();
  // list.select(0);
  screen.render();

  return new Promise((resolve, reject) => {
    table.on("select", function(item) {
      const value = item.content;
      // // console.log(`${value} selected`);
      table.destroy();
      resolve(value);
    });

    table.on("cancel ", function(value) {
      // // console.log(`rejected`);
      reject(new Error("cancel"));
    });
  });
}
module.exports = { list, listtable}