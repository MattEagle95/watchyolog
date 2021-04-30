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
          DATABASE_ADDRESS: process.env.DATABASE_ADDRESS
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
        path: '/var/www/watchyolog',
        'post-deploy':
          'npm install && pm2 reload ecosystem.config.js --env production && pm2 save && git checkout package-lock.json',
        env: {
          NODE_ENV: 'production'
        },
      },
    },
  }