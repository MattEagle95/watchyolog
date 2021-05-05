const Discord = require("discord.js");
const pm2 = require('pm2');
const table = require('text-table');
const Commands = { restart: "restart", reload: "reload", stop: "stop", list: "list", describe: "describe" }

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
                desc = desc[0];

                let status = `\"${desc.pm2_env.status}\"`;
                if (desc.pm2_env.status !== 'online') {
                    status = `\'${desc.pm2_env.status}\'`;
                }

                const rows = [];
                rows.push(['PID', desc.pid]);
                rows.push(['PM_ID', desc.pm_id]);
                rows.push(['NAME', desc.name]);
                rows.push(['STATUS', status]);
                rows.push(['PM_UPTIME', timeDifference(Date.now(), desc.pm2_env.pm_uptime),]);
                rows.push(['EXEC_INTERPRETER', desc.pm2_env.exec_interpreter]);
                rows.push(['INSTANCES', desc.pm2_env.instances]);
                rows.push(['PM_CWD', desc.pm2_env.pm_cwd]);
                rows.push(['PM_ERR_LOG_PATH', desc.pm2_env.pm_err_log_path]);
                rows.push(['PM_EXEC_PATH', desc.pm2_env.pm_exec_path]);
                rows.push(['PM_OUT_LOG_PATH', desc.pm2_env.pm_out_log_path]);
                rows.push(['RESTART_TIME', desc.pm2_env.restart_time]);
                rows.push(['UNSTABLE_RESTARTS', desc.pm2_env.unstable_restarts]);
                rows.push(['CPU USED', `${desc.monit.cpu} %`]);
                rows.push(['RAM USED',  formatBytes(desc.monit.memory)]);

                message.reply(`\`\`\`ml\n${table(rows)}\`\`\``);
            })
        });
    }

    if (command === Commands.list) {
        pm2.connect(function (err) {
            pm2.list((err, list) => {
                let output = "";

                output += `${list.filter(x => x.pm2_env.status === 'online').length}/${list.length} online\n\n`;

                const rows = [];
                rows.push(["PM_ID", "NAME", "STATUS", "ONLINE SINCE", "CPU USED", "RAM USED"])

                list.forEach(process => {

                    let status = `\"${process.pm2_env.status}\"`;
                    if (process.pm2_env.status !== 'online') {
                        status = `\'${process.pm2_env.status}\'`;
                    }

                    rows.push([
                        process.pm_id,
                        process.name,
                        `${status}`,
                        timeDifference(Date.now(), process.pm2_env.pm_uptime),
                        `${process.monit.cpu} %`,
                        formatBytes(process.monit.memory)
                    ]);
                })

                output += table(rows);

                message.reply(`\`\`\`ml\n${output}\`\`\``);
            })
        });
    }

    if (command === Commands.restart) {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            message.reply(`restarting...`);

            pm2.restart(args[0].trim(), (err) => {
                if (err) {
                    console.error(err);
                }

            });
        });
    }

    if (command === Commands.reload) {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            message.reply(`reloading...`);

            pm2.reload(args[0].trim(), (err) => {
                if (err) {
                    console.error(err);
                }

            });
        });
    }

    if (command === Commands.stop) {
        console.log('stopping');

        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            message.reply(`stopping...`);

            pm2.stop(args[0].trim(), (err) => {
                if (err) {
                    console.error(err);
                }

            });
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

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}