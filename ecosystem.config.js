
module.exports = {
  apps: [
    {
      name: 'humango-app',
      script: '.next/standalone/server.js',
      cwd: '/var/www/bot.humango.app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://bot_user:Web3p00d123@localhost:5432/humango_db',
        NEXT_PUBLIC_BASE_URL: 'https://bot.humango.app'
      }
    },
    {
      name: 'humango-worker',
      script: 'node_modules/.bin/tsx',
      args: 'src/scripts/worker.ts',
      cwd: '/var/www/bot.humango.app',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://bot_user:Web3p00d123@localhost:5432/humango_db',
        SMTP_HOST: 'smtp.beget.com',
        SMTP_PORT: 2525,
        SMTP_USER: 'abuse@humango.app',
        SMTP_PASS: 'mQ0c33Yn!W6i' 
      }
    }
  ]
};
