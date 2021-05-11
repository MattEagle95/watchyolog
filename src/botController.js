const Discord = require("discord.js");
const pm2 = require('pm2');
const fs = require('fs');
const table = require('text-table');
const Command = require('./command');
const { timeSince, formatBytes } = require('./util');
const configService = require('./guildConfig');
const commandController = require('./commandController');

const prefix = '!';

const client = new Discord.Client();
client.login(process.env.BOT_TOKEN);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    client.user.setPresence({ activity: { name: 'Processes', type: 'WATCHING' }, status: 'online' });

    sendEventMsg(`I'm online`);
});

const broadcastEventMsg = (msg) => {
    const guilds = await configService.get();

    guilds.forEach(guild => {
        const channel = client.channels.cache.find(channel => guild.event_channel && channel.id === guild.event_channel.id);
        if (channel) {
            channel.send(msg);
        }
    });
}

const broadcastErrorLogMsg = (msg) => {
    const guilds = await configService.get();

    guilds.forEach(guild => {
        const channel = client.channels.cache.find(channel => guild.error_log_channel && channel.id === guild.event_channel.id);
        if (channel) {
            channel.send(msg);
        }
    });
}

const handleError = (message, err) => {
    message.reply(`:red_circle: ${err}`);
    console.error(err);
}

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

    switch (command) {
        case Command.ping:
            message.send(commandController.ping());
            break;

        case Command.help:
            message.send(commandController.help());
            break;

        case Command.config:
            message.send(await commandController.config());
            break;

        case Command.configSetEvent:
            message.send(await commandController.configSetEvent());
            break;

        case Command.configSetError:
            message.send(await commandController.configSetError());
            break;

        case Command.configSetLogCategory:
            message.send(await commandController.configSetLogCategory());
            break;

        case Command.configSetDefault:
            message.send(await commandController.configSetDefault());
            break;

        case Command.pm2.list:
            pm2Controller.list(message);
            break;

        default:
            break;
    }

    if (command === Commands.start || command === Commands.configSetDefault) {
        try {
            fs.readFile('config.json', 'utf8', (err, data) => {
                if (err) {
                    messageError(message, err);
                } else {
                    jsonConfig = JSON.parse(data);
                    let foundGuild = jsonConfig.guilds.find(guild => guild.id === message.guild.id);
                    if (foundGuild) {
                        foundGuild = {
                            id: message.guild.id,
                            command_prefix: '!',
                            event_channel: { id: message.channel.id, name: message.channel.name },
                            error_log_channel: { id: message.channel.id, name: message.channel.name },
                            log_category: null
                        }
                    } else {
                        jsonConfig.guilds.push({
                            id: message.guild.id,
                            command_prefix: '!',
                            event_channel: { id: message.channel.id, name: message.channel.name },
                            error_log_channel: { id: message.channel.id, name: message.channel.name },
                            log_category: null
                        })
                    }

                    json = JSON.stringify(jsonConfig);
                    fs.writeFile('config.json', json, 'utf8', () => { });
                }
            });
        } catch (err) {
            messageError(message, err);
        }
    }

    if (command === Commands.config) {
        fs.readFile('config.json', 'utf8', (err, data) => {
            jsonConfig = JSON.parse(data);
            const guildConfig = jsonConfig.guilds.find(guild => guild.id === message.guild.id);

            const rows = [];
            rows.push(['COMMAND_PREFIX', guildConfig.command_prefix]);
            rows.push(['EVENT_CHANNEL', guildConfig.event_channel.name]);
            rows.push(['ERROR_LOG_CHANNEL', guildConfig.error_log_channel.name]);
            rows.push(['LOG_CHANNEL_CATEGORY', guildConfig.log_category.name ? guildConfig.log_category.name : '']);

            message.reply(`\`\`\`\n${table(rows)}\`\`\``);
        });
    }

    if (command === Commands.configSet) {
        fs.readFile('config.json', 'utf8', (err, data) => {
            if (err) {
                console.log(err);
            } else {
                jsonConfig = JSON.parse(data); //now it an object
                jsonConfig.guilds.find(guild => guild.id === message.guild.id).command_prefix = args[1]
                json = JSON.stringify(jsonConfig); //convert it back to json
                fs.writeFile('config.json', json, 'utf8', () => { }); // write it back 
            }
        });
    }

    if (command === Commands.pm2.describe) {
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

    if (command === Commands.pm2.list) {
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
                        timeSince(Date.now(), process.pm2_env.pm_uptime),
                        `${process.monit.cpu} %`,
                        formatBytes(process.monit.memory)
                    ]);
                })

                output += table(rows);

                message.reply(`\`\`\`ml\n${output}\`\`\``);
            })
        });
    }

    if (command === Commands.pm2.restart) {
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

    if (command === Commands.pm2.reload) {
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

    if (command === Commands.pm2.stop) {
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

    if (command === Commands.pm2.delete) {
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

    if (command === Commands.pm2.flush) {
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

    if (command === Commands.pm2.reloadLogs) {
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