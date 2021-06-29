(async () => {

  console.log("starting...")
  await require("./persist.js")(["BTCUSD.json", "ETHUSD.json", "Gas.json"])
  console.log("persist initialized")

  const api = require("./ws.js")
  const fs = require("fs")
  const config = require("./config.json")
  const http = require("http")
  let statusOnCD = false
  const server = http.createServer((req, res) => {
    res.writeHead(200)
    res.write("discord illegal")
    res.end()
  }).listen(8080)
  const Discord = require("discord.js")
  const Client = new Discord.Client()
  Client.login(config.token)
  Client.on("ready", async () => {
    console.log("ready")
  })


  let status = {}

  for (const ticker of config.ticker) {
    status[ticker[0]] = JSON.parse(fs.readFileSync(`./${ticker[0]}.json`));
  }


  console.log(status)

  Client.on("message", (msg) => {
    if (msg.content.startsWith("!alerts") || msg.content.startsWith("!alerts ") || msg.content.startsWith("!a") || msg.content.startsWith("!a ")) {
      const args = msg.content.split(" ").slice(1)

      if (args.length == 0 || args[0] === "list" || args[0] === "l") {
        const alertsEmbed = new Discord.MessageEmbed().setColor("#30cfff").setTimestamp().setTitle("📜 Price Alerts                                       ​")
        for (const ticker of config.ticker) {
          if (ticker[1].includes(args[1])) {
            let index = 0;
            for (let i = 0; i < status[ticker[0]].as.length; i++) {
              if (msg.author.id === status[ticker[0]].as[i].a) {
                alertsEmbed.addFields(
                  { name: "#️⃣", value: index, inline: true },
                  { name: (status[ticker[0]].as[i].d > 0 ? "📈" : "📉") + " Type", value: status[ticker[0]].as[i].d > 0 ? "Upward" : "Downward", inline: true },
                  { name: "💰  Price", value: (ticker[0] != "Gas" ? "$" : "") + status[ticker[0]].as[i].p + (ticker[0] == "Gas" ? " gwei" : ""), inline: true }
                )
                index++
              }
            }
            msg.channel.send(alertsEmbed)
            break
          }
        }


      } else if (args[0] === "add" || args[0] === "a") {
        if (args[2]) {
          for (const ticker of config.ticker) {
            if (ticker[1].includes(args[1])) {
              let count = 0
              console.log(status[ticker[0]])
              for (const alert of status[ticker[0]].as) {
                if (alert.a === msg.author.id) count++
              }
              for (const price of args.slice(2)) {
                if (!(+price <= 1e7 && +price && +price >= 0)) {
                  const errorEmbed = new Discord.MessageEmbed().setColor("#30cfff").setTimestamp().setTitle("⛔ Error").setDescription(`Invalid value '${price}'.`)
                  msg.channel.send(errorEmbed)
                  return
                }
              }

              for (const price of args.slice(2)) {
                status[ticker[0]].as.push({
                  a: msg.author.id,
                  c: msg.channel.id,
                  p: +price,
                  d: status[ticker[0]].l > +price ? -1 : 1
                })
              }
              fs.writeFileSync(`./${ticker[0]}.json`, JSON.stringify(status[ticker[0]]))
              const setEmbed = new Discord.MessageEmbed().setColor("#30cfff").setTimestamp().setTitle(`✅ ${ticker[0]} Price Alert(s) Set`)
              for (const price of args.slice(2)) {
                setEmbed.addFields(
                  { name: "#️⃣", value: count, inline: true },
                  { name: (status[ticker[0]].l > +price ? "📉" : "📈") + ' Type', value: status[ticker[0]].l > +price ? "Downward" : "Upward", inline: true },
                  { name: '💰  Price', value: (ticker[0] != "Gas" ? "$" : "") + +price + (ticker[0] == "Gas" ? " gwei" : ""), inline: true }
                )
                count++
              }
              msg.channel.send(setEmbed)
            }
          }
        } else {
          const errorEmbed = new Discord.MessageEmbed().setColor("#30cfff").setTimestamp().setTitle("⛔ Error").setDescription(`Provide a value to add`)
          msg.channel.send(errorEmbed)
        }

      } else if (args[0] === "remove" || args[0] === "r") {
        for (const ticker of config.ticker) {
          if (ticker[1].includes(args[1])) {
            if (args[1] && args[2]) {
              let index = 0
              const removeEmbed = new Discord.MessageEmbed().setColor("#30cfff").setTimestamp().setTitle(`🚫 ${ticker[0]} Price Alert(s) Removed`)
              for (let i = 0; i < status[ticker[0]].as.length; i++) {
                if (msg.author.id === status[ticker[0]].as[i].a) {

                  if (index === +args[2] || args[2] === "a" || args[2] === "all") {
                    removeEmbed.addFields(
                      { name: "#️⃣", value: index, inline: true },
                      { name: (status[ticker[0]].as[i].d > 0 ? "📈" : "📉") + " Type", value: status[ticker[0]].as[i].d > 0 ? "Upward" : "Downward", inline: true },
                      { name: "💰 Price", value: (ticker[0] != "Gas" ? "$" : "") + status[ticker[0]].as[i].p + (ticker[0] == "Gas" ? " gwei" : ""), inline: true }
                    )
                    status[ticker[0]].as.splice(i, 1)
                    i--
                    if (args[2] !== "a" && args[2] !== "all") {
                      fs.writeFileSync(`./${ticker[0]}.json`, JSON.stringify(status[ticker[0]]))
                      msg.channel.send(removeEmbed)
                      return
                    }
                  }
                  index++
                  
                }
              }
              if (args[2] === "a" || args[2] === "all") {
                    fs.writeFileSync(`./${ticker[0]}.json`, JSON.stringify(status[ticker[0]]))
                    msg.channel.send(removeEmbed)
                  } else {
                    const errorEmbed = new Discord.MessageEmbed().setColor("#30cfff").setTimestamp().setTitle("⛔ Error").setDescription(`Price alert index '${args[2]}' not found.`)
                    msg.channel.send(errorEmbed)
                  }
            } else {
              const errorEmbed = new Discord.MessageEmbed().setColor("#30cfff").setTimestamp().setTitle("⛔ Error").setDescription(`Price alert index '${args[2]}' not found.`)
              msg.channel.send(errorEmbed)
            }
          }
        }
      }
    }
  })

  for (const ticker of config.ticker) {
    api.on(ticker[0], async (lastPrice) => {
      if (lastPrice !== status[ticker[0]].l) {
        status[ticker[0]] = JSON.parse(fs.readFileSync(`./${ticker[0]}.json`));
        for (let i = 0; i < status[ticker[0]].as.length; i++) {
          if (status[ticker[0]].as[i].d > 0 && lastPrice > status[ticker[0]].as[i].p) {
            const triggerEmbed = new Discord.MessageEmbed().setColor("#00ff00").setTimestamp().setTitle(`❗ ${ticker[0]} Price Alert Triggered`)
              .addFields(
                { name: '📈 Type', value: "Upward", inline: true },
                { name: '💰 Price', value: (ticker[0] != "Gas" ? "$" : "") + status[ticker[0]].as[i].p + (ticker[0] == "Gas" ? " gwei" : ""), inline: true }
              )
            Client.channels.cache.get(status[ticker[0]].as[i].c).send(`<@${status[ticker[0]].as[i].a}>`, triggerEmbed)
            status[ticker[0]].as.splice(i, 1)
            i--
          } else if (status[ticker[0]].as[i].d < 0 && lastPrice < status[ticker[0]].as[i].p) {
            const triggerEmbed = new Discord.MessageEmbed().setColor("#ff0000").setTimestamp().setTitle(`❗ ${ticker[0]} Price Alert Triggered`)
              .addFields(
                { name: '📉 Type', value: "Downward", inline: true },
                { name: '💰 Price', value: (ticker[0] != "Gas" ? "$" : "") + status[ticker[0]].as[i].p + (ticker[0] == "Gas" ? " gwei" : ""), inline: true }
              )
            Client.channels.cache.get(status[ticker[0]].as[i].c).send(`<@${status[ticker[0]].as[i].a}>`, triggerEmbed)
            status[ticker[0]].as.splice(i, 1)
            i--
          }
        }
        status[ticker[0]].l = lastPrice
        fs.writeFileSync(`./${ticker[0]}.json`, JSON.stringify(status[ticker[0]]))
        updateActivity()
      }
    })
  }

  function updateActivity() {
    if (!statusOnCD) {
      statusOnCD = true
      setTimeout(() => {
        statusOnCD = false
      }, config.statusUpdateCD)
      let activityStr = ""
      for (const ticker of config.ticker) {
        activityStr += `${ticker[0]}: ${ticker[0] != "Gas" ? "$" : ""}${status[ticker[0]].l}${ticker[0] == "Gas" ? " gwei" : ""} | `
      }
      activityStr = activityStr.slice(0, -2)
      Client.user.setActivity(activityStr, { type: 'WATCHING' }).catch(console.log)
    }
  }
})()