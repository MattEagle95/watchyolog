const Discord = require("discord.js");
const pm2 = require('pm2')

const client = new Discord.Client();
const prefix = "!";

client.login(process.env.BOT_TOKEN);

pm2.launchBus(function (err, bus) {
    if (err) {
        console.error(err)
    }

    bus.on('process:event', function (packet) {
        console.log(`process:event ${packet.process.name}`)
        const channel = client.channels.cache.find(channel => channel.name === 'general');
        channel.send(`process:event ${packet.process.name}`);
    })

    bus.on('log:out', function (packet) {
        console.log(`log:out ${packet.process.name}`)
        const channel = client.channels.cache.find(channel => channel.name === 'general');
        channel.send(`log:out ${packet.process.name}`);
    })
})

client.on("message", function (message) {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const commandBody = message.content.slice(prefix.length);
    const args = commandBody.split(' ');
    const command = args.shift().toLowerCase();

    if (command === "ping") {
        const timeTaken = Date.now() - message.createdTimestamp;
        message.reply(`Pong! This message had a latency of ${timeTaken}ms`);
    }

    if (command === "list") {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            pm2.list((err, list) => {
                let output = "";

                output += `${list.filter(x => x.pm2_env.status === 'online').length}/${list.length} online\n\n`;

                list.forEach(process => {
                    output += `**${process.name}** - ${process.pm2_env.status} - ${timeDifference(Date.now(), process.pm2_env.pm_uptime)}\n`;
                })

                message.reply(output);
                console.log(err, list);
            })
        });
    }

    if (command === "describe") {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            pm2.describe(args[0], (err, desc) => {
                let output = `
                pid: ${desc.pid}
                pm_id: ${desc.pm_id}
                name: ${desc.name}
                `;

                message.reply(output);
                console.log(err, list);
            })
        });
    }
});

function timeDifference(current, previous) {

    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous;

    if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ' seconds';
    }

    else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' minutes';
    }

    else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' hours';
    }

    else if (elapsed < msPerMonth) {
        return 'approximately ' + Math.round(elapsed / msPerDay) + ' days ago';
    }

    else if (elapsed < msPerYear) {
        return 'approximately ' + Math.round(elapsed / msPerMonth) + ' months ago';
    }

    else {
        return 'approximately ' + Math.round(elapsed / msPerYear) + ' years ago';
    }
}