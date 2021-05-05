const Discord = require("discord.js");
const pm2 = require('pm2');
const fs = require('fs');
const table = require('text-table');
const Commands = { restart: "restart", reload: "reload", stop: "stop", list: "list", describe: "describe", delete: "delete", flush: "flush", reloadLogs: "reloadLogs" }

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
        if (packet.event === 'restart' || packet.event === 'reload' || packet.event === 'exit') {
            channel.send(`:tools: ${packet.event} - ${packet.process.name}`);
            return;
        }

        if (packet.event === 'stop') {
            channel.send(`:stop_sign: ${packet.event} - ${packet.process.name}`);
            return;
        }

        if (packet.event === 'online') {
            channel.send(`:green_circle: ${packet.event} - ${packet.process.name}`);
            return;
        }

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

const messageError = (message, err) => {
    message.reply(`:red_circle: ${err}`);
    console.error(err);
}

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
        const rows = [];
        rows.push(['!help', 'help']);
        rows.push(['!list', 'pm2 list']);
        rows.push(['!describe [process]', 'pm2 describe']);
        rows.push(['!restart [process]', 'pm2 restart']);
        rows.push(['!reload [process]', 'pm2 reload']);
        rows.push(['!stop [process]', 'pm2 stop']);
        rows.push(['!delete [process]', 'pm2 delete']);
        rows.push(['!reloadLogs', 'pm2 reloadLogs']);
        rows.push(['!flush [process]', 'pm2 flush']);
        rows.push(['!config', 'returns the config']);
        rows.push(['!configSet [name] [value]', 'sets a config value']);
        rows.push(['!configSetEvent', 'sets the current channel as event channel']);
        rows.push(['!configSetErrorLog', 'sets the current channel as error log channel']);
        rows.push(['!configSetDefault', 'resets the config']);
        rows.push(['!ping', 'returns the bot latency']);

        message.reply(`\`\`\`\n${table(rows)}\`\`\``);
    }

    if (command === "init") {
        try {
            fs.readFile('./config.json', 'utf8', function readFileCallback(err, data) {
                if (err) {
                    console.log(err);
                } else {
                    jsonConfig = JSON.parse(data); //now it an object
                    jsonConfig.guilds.push({
                        id: message.guild.id,
                        command_prefix: '!',
                        event_channel: 'general',
                        error_log_channel: 'general',
                        log_category: 'logs'
                    })
                    json = JSON.stringify(jsonConfig); //convert it back to json
                    fs.writeFile('./config.json', json, 'utf8', callback); // write it back 
                }
            });
        } catch (err) {
            messageError(message, err);
        }
    }

    if (command === "config") {
        fs.readFile('./config.json', 'utf8', function readFileCallback(err, data) {
            const guildConfig = data.guilds.find(guild => guild.id === message.guild.id);

            const rows = [];
            rows.push(['COMMAND_PREFIX', guildConfig.command_prefix]);
            rows.push(['EVENT_CHANNEL', guildConfig.event_channel]);
            rows.push(['ERROR_LOG_CHANNEL', guildConfig.error_log_channel]);
            rows.push(['LOG_CHANNEL_CATEGORY', guildConfig.log_category]);

            message.reply(`\`\`\`\n${table(rows)}\`\`\``);
        });
    }

    if (command === "configSet") {
        const guildConfig = config.guilds.find(guild => guild.id === message.guild.id);

        fs.readFile('config.json', 'utf8', function readFileCallback(err, data) {
            if (err) {
                console.log(err);
            } else {
                jsonConfig = JSON.parse(data); //now it an object
                jsonConfig.guilds.find(guild => guild.id === message.guild.id).command_prefix = args[0].trim()
                json = JSON.stringify(jsonConfig); //convert it back to json
                fs.writeFile('config.json', json, 'utf8', callback); // write it back 
            }
        });
    }

    if (command === Commands.describe) {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            pm2.describe(args[0], (err, desc) => {
                try {
                    desc = desc[0];

                    let status = `\"${desc.pm2_env.status}\"`;
                    if (desc.pm2_env.status !== 'online') {
                        status = `\'${desc.pm2_env.status}\'`;
                    }

                    const rows = [];
                    rows.push(['PID', desc.pid ? desc.pid : '']);
                    rows.push(['PM_ID', desc.pm_id]);
                    rows.push(['NAME', desc.name]);
                    rows.push(['STATUS', status]);
                    rows.push(['PM_UPTIME', timeDifference(Date.now(), desc.pm2_env.pm_uptime)]);
                    rows.push(['EXEC_INTERPRETER', desc.pm2_env.exec_interpreter]);
                    rows.push(['INSTANCES', desc.pm2_env.instances ? desc.pm2_env.instances : 0]);
                    rows.push(['PM_CWD', desc.pm2_env.pm_cwd]);
                    rows.push(['PM_ERR_LOG_PATH', desc.pm2_env.pm_err_log_path]);
                    rows.push(['PM_EXEC_PATH', desc.pm2_env.pm_exec_path]);
                    rows.push(['PM_OUT_LOG_PATH', desc.pm2_env.pm_out_log_path]);
                    rows.push(['RESTART_TIME', desc.pm2_env.restart_time ? desc.pm2_env.restart_time : 0]);
                    rows.push(['UNSTABLE_RESTARTS', desc.pm2_env.unstable_restarts ? desc.pm2_env.unstable_restarts : 0]);
                    rows.push(['CPU USED', `${desc.monit.cpu} %`]);
                    rows.push(['RAM USED', formatBytes(desc.monit.memory)]);

                    message.reply(`\`\`\`ml\n${table(rows)}\`\`\``);
                } catch (err) {
                    messageError(message, err);
                }
            })
        });
    }

    if (command === Commands.list) {
        pm2.connect(function (err) {
            pm2.list((err, list) => {
                let output = "";

                output += `${list.filter(x => x.pm2_env.status === 'online').length}/${list.length} online\n\n`;

                const rows = [];
                rows.push(["PM_ID", "NAME", "STATUS", "UPTIME", "CPU USED", "RAM USED"])

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

            const name = args[0].trim();

            message.reply(`:tools: restarting...`);

            pm2.restart(name, (err) => {
                if (err) {
                    console.error(err);
                }

                message.reply(`:green_circle: ${name} restarting...`);
            });
        });
    }

    if (command === Commands.reload) {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            const name = args[0].trim();

            message.reply(`:tools: reloading...`);

            pm2.reload(name, (err) => {
                if (err) {
                    messageError(message, err);
                    return;
                }

                message.reply(`:green_circle: ${name} reloading...`);
            });
        });
    }

    if (command === Commands.stop) {
        console.log('stopping');

        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            const name = args[0].trim();

            message.reply(`:tools: stopping...`);

            pm2.stop(name, (err) => {
                if (err) {
                    messageError(message, err);
                    return;
                }

                message.reply(`:green_circle: ${name} stopping...`);
            });
        });
    }

    if (command === Commands.delete) {
        console.log('deleting');

        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            const name = args[0].trim();

            message.reply(`:tools: deleting...`);

            pm2.delete(name, (err) => {
                if (err) {
                    messageError(message, err);
                    return;
                }

                message.reply(`:green_circle: ${name} deleted...`);
            });
        });
    }

    if (command === Commands.flush) {
        console.log('flushing');

        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            const name = args[0].trim();

            message.reply(`:tools: flushing...`);

            pm2.flush(name, (err) => {
                if (err) {
                    messageError(message, err);
                    return;
                }

                message.reply(`:green_circle: ${name} logs flushed...`);
            });
        });
    }

    if (command === Commands.reloadLogs) {
        console.log('reloading logs');

        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }

            message.reply(`:tools: reloading logs...`);

            pm2.reloadLogs((err) => {
                if (err) {
                    messageError(message, err);
                    return;
                }

                message.reply(`:green_circle: logs reloaded...`);
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