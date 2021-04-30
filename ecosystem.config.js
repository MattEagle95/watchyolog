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
                PORT: 3000
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
            "pre-setup" : "git fetch && git reset --hard origin/dev",
            "pre-deploy": "git fetch && git reset --hard origin/dev",
            "post-deploy":
                'echo "test" > test.key; pm2 startOrRestart source/ecosystem.config.js --env production; pm2 save',
            env: {
                NODE_ENV: 'production'
            },
        },
    },
}