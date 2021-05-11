const table = require('text-table');
const configService = require('./guildConfig');

const ping = (message) => {
    const timeTaken = Date.now() - message.createdTimestamp;
    return `Pong! This message had a latency of ${timeTaken}ms`;
}

const help = (message) => {
    const rows = [
        ['!help', 'help'],
        ['!list', 'pm2 list'],
        ['!describe [process]', 'pm2 describe'],
        ['!restart [process]', 'pm2 restart'],
        ['!reload [process]', 'pm2 reload'],
        ['!stop [process]', 'pm2 stop'],
        ['!delete [process]', 'pm2 delete'],
        ['!reload-logs', 'pm2 reloadLogs'],
        ['!flush [process]', 'pm2 flush'],
        ['!config', 'returns the config'],
        ['!config-set [name] [value]', 'sets a config value'],
        ['!config-set-default', 'resets the config'],
        ['!ping', 'returns the bot latency']
    ];

    return `\`\`\`\n${table(rows)}\`\`\``;
}

const config = async (id) => {
}

const configSetEvent = async (id) => {
}

const configSetError = async (id) => {
}

const configSetLogCategory = async (id) => {
}

const configSetDefault = async (id) => {
}

module.exports = {
    ping,
    help
}