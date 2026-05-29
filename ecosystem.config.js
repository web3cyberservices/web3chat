/**
 * PM2 Ecosystem Configuration - Secure Version
 * Sensitive data moved to .env file.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'humango-app',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/bot.humango.app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
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
        NODE_ENV: 'production',
        SCRIPTS_RUN: 'true'
      },
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};
