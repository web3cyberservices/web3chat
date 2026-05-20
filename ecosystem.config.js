
/**
 * PM2 Ecosystem Configuration - Secure Version
 * Sensitive data moved to .env file.
 */
module.exports = {
  apps: [
    {
      name: 'humango-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/bot.humango.app',
      env: {
        NODE_ENV: 'production'
      },
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100
    },
    {
      name: 'humango-worker',
      script: 'node_modules/.bin/tsx',
      args: 'src/scripts/worker.ts',
      cwd: '/var/www/bot.humango.app',
      env: {
        NODE_ENV: 'production'
      },
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};
