const pm2 = require('pm2')

pm2.launchBus(function (err, bus) {
    if (err) {
        console.error(err)
    }

    bus.on('process:event', function (packet) {
        console.log(JSON.stringify(packet))
        console.log(`process:event ${packet.process.name}`);
    })
});