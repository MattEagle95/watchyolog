const Discord = require("discord.js");
const pm2 = require('pm2')

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
        message.reply(`Pong! This message had a latency of ${timeTaken}ms`);
    }

    if (command === "list") {
        pm2.connect(function (err) {
            if (err) {
                console.error(err);
            }
        
            pm2.list((err, list) => {
                let output = "";

                output += `${list.filter(x => x.pm2_env.status === 'online').length}/${list.length} online`;
        
                list.forEach(process => {
                    output += `${process.name} ${timeDifference(process.pm2_env.pm_uptime)} ${process.pm2_env.unstable_restarts} ${process.pm2_env.status} \n`;
                })
        
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
         return Math.round(elapsed/1000) + ' seconds ago';   
    }

    else if (elapsed < msPerHour) {
         return Math.round(elapsed/msPerMinute) + ' minutes ago';   
    }

    else if (elapsed < msPerDay ) {
         return Math.round(elapsed/msPerHour ) + ' hours ago';   
    }

    else if (elapsed < msPerMonth) {
        return 'approximately ' + Math.round(elapsed/msPerDay) + ' days ago';   
    }

    else if (elapsed < msPerYear) {
        return 'approximately ' + Math.round(elapsed/msPerMonth) + ' months ago';   
    }

    else {
        return 'approximately ' + Math.round(elapsed/msPerYear ) + ' years ago';   
    }
}