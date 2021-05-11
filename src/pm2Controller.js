const pm2 = require('pm2');

const startListening = () => {
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
}

module.exports = {
    startListening
}