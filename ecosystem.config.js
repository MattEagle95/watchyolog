module.exports = {
    apps: [
        {
            name: 'watchyolog',
            script: 'npm start',
            time: true,
            instances: 1,
            autorestart: true,
            max_restarts: 50,
            watch: false,
            max_memory_restart: '1G',
            env: {
                PORT: 3000,
                BOT_TOKEN: process.env.BOT_TOKEN
            },
        },
    ],
    deploy: {
        production: {
            user: 'nodejs',
            host: '139.59.211.241',
            key: 'deploy.key',
            ref: 'origin/main',
            repo: 'https://github.com/MattEagle95/watchyolog',
            path: '/var/www/nodejs/watchyolog',
            "post-deploy":
                'npm install; pm2 reload ecosystem.config.js --env production; pm2 save',
            env: {
                NODE_ENV: 'production',
                BOT_TOKEN: process.env.BOT_TOKEN
            },
        },
    },
}