const Discord = require("discord.js");

const client = new Discord.Client();
const prefix = "!";

client.login(process.env.BOT_TOKEN);

client.on("message", function (message) {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    if (command === "ping") {
        const timeTaken = Date.now() - message.createdTimestamp;
        message.reply(`Pong! This message had a latency of ${timeTaken}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
        message.reply(`⚠ Warnung`);
    }
});