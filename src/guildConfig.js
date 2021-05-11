const fsp = require("fs/promises");

const configPath = 'config.json';
const encoding = 'utf8';

const get = (id = null) => {
    return fsp.readFile(configPath, encoding)
        .then(data => {
            try {
                const parsedData = JSON.parse(data);

                if (!id) {
                    return parsedData.guilds;
                }

                return parsedData.guilds.find(guild => guild.id === id);
            } catch (err) {
                throw (err);
            }
        })
}

const set = (id, values) => {
    fsp.readFile(configPath, encoding, (err, data) => {
        if (err) {
            throw (err);
        }

        try {
            const parsedData = JSON.parse(data);
            const guildConfig = parsedData.guilds.find(guild => guild.id === id);

            fs.writeFile(configPath, JSON.stringify({ ...guildConfig, ...values }), encoding, () => {
                return;
            });
        } catch (err) {
            throw (err);
        }
    });
}

module.exports = {
    get,
    set
}