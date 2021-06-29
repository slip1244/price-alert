// Files and modules

const config = require("./config.json")
const crypto = require("crypto")
const fetch = require("node-fetch")
const WebSocket = require("ws")
const net = config.testing ? "testnet" : "mainnet"
let last = {};

// Connect to sockets

const expires = Date.now() + 5000
const bybit = new WebSocket(`${config[net].dataApi}?api_key=${config[net].keys.key}&expires=${expires}&signature=${crypto.createHmac("sha256", config[net].keys.secret).update(`GET/realtime${expires}`).digest("hex")}`)

bybit.on("open", () => {
    emit("connect", "Bybit")
    const args = []
    for (const ticker of config.ticker) {
      if (ticker[0] != "Gas") args.push("klineV2." + config.interval + "." + ticker[0])
    }
    bybit.send(JSON.stringify({
        op: "subscribe",
        args: args
    }))
})

bybit.on("close", () => {
    console.log("socket closed")
    process.exit()
})

// Socket data

bybit.on("message", msg => {
    try {
        msg = JSON.parse(msg)
        if (msg.topic.slice(0,7) === "klineV2") {
          const ticker = msg.topic.split(".")[2]
          if (last[ticker] != msg.data[0].close) {
            
              emit(ticker, msg.data[0].close)
              last[ticker] = msg.data[0].close
          }
        } else if (msg.topic === "execution") {
            emit("execution", msg.data)
        }
    } catch {}
})


// Events

const events = {}

function on(event, handler) {
    if (events[event]) {
        events[event].push(handler)
    } else {
        events[event] = [handler]
    }
}

function emit(event, data) {
    if (events[event]) {
        for (const handler of events[event]) {
            handler(data)
        }
    }
}

setInterval(async () => {
  emit("Gas", await fetch("https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=" + config.etherscanKey).then(res => res.json()).then(res => res.result.ProposeGasPrice))
}, 2000)

// Exports

module.exports = {
    on: on
}