import Discord from "discord.js";
import pm2 from 'pm2';
import { markdownTable } from "markdown-table";
const Commands = {restart: "restart", reload: "reload", stop: "stop", list: "list", describe: "describe"}

const client = new Discord.Client();
const prefix = "!";

const logProcesses = [];

client.login(process.env.BOT_TOKEN);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({ activity: { name: 'with discord.js', type: 'WATCHING' }, status: 'online' });

    const channel = client.channels.cache.find(channel => channel.name === 'general');
    channel.send(`I AM BACK!`);
});

pm2.launchBus(function (err, bus) {
    if (err) {
        console.error(err)
    }

    bus.on('process:event', function (packet) {
        const channel = client.channels.cache.find(channel => channel.name === 'general');
        channel.send(`EVENT: ${packet.event} - ${packet.process.name}`);
    })

    bus.on('log:out', function (packet) {
        if (logProcesses.indexOf(packet.process.name.trim()) !== -1) {
            const channel = client.channels.cache.find(channel => channel.name === `log-${packet.process.name.trim()}`);
            channel.send(`${packet.process.name}: ${packet.data}`);
        }
    })

    bus.on('log:err', function (packet) {
        const channel = client.channels.cache.find(channel => channel.name === 'error-log');
        channel.send(`${packet.process.name}: ${packet.data}`);
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

    if (command === "help") {
        message.reply(`
**Help**
!ping - returns the latency
!commands - show available commands
!list - pm2 list
!describe - pm2 describe
!reload - pm2 reload
        `);
    }

    if (command === Commands.describe) {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            pm2.describe(args[0], (err, desc) => {
                desc = desc[0]
                let output = `
args: ${args[0]}
pid: ${desc.pid}
pm_id: ${desc.pm_id}
name: ${desc.name}
                `;

                message.reply(output);
            })
        });
    }

    if (command === Commands.list) {
        pm2.connect(function (err) {
            pm2.list((err, list) => {
                let output = "";

                output += `${list.filter(x => x.pm2_env.status === 'online').length}/${list.length} online\n\n`;

                const rows = [];
                rows.push(["PID", "NAME", "STATUS", "ONLINE SINCE"])

                list.forEach(process => {
                    rows.push([process.pid, process.name, process.pm2_env.status, timeDifference(Date.now(), process.pm2_env.pm_uptime)]);
                })

                output += markdownTable(rows);

                message.reply(output);
            })
        });
    }

    if (command === Commands.restart) {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            pm2.restart(args[0].trim(), (err) => { console.error(err); });
        });
    }

    if (command === Commands.reload) {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            pm2.reload(args[0].trim(), (err) => { console.error(err); });
        });
    }

    if (command === Commands.stop) {
        console.log('stopping');

        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            pm2.stop(args[0].trim(), (err) => { console.error(err); });
        });
    }

    if (command === "log") {
        logProcesses.push(args[0].trim());
        message.guild.channels.create(`log-${args[0].trim()}`, { type: 'text' })
            .then(channel => {
                let category = message.guild.channels.cache.find(c => c.name == "dev-server" && c.type == "category");

                if (!category) throw new Error("Category channel does not exist");
                channel.setParent(category.id);
            }).catch(console.error);
    }
});

client.on("channelDelete", function (channel) {
    console.log(`channelDelete: ${channel.name}`);
    if (logProcesses.indexOf(channel.name) !== -1) {
        logProcesses.splice(logProcesses.indexOf(channel.name), 1);
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