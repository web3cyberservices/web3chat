
module.exports = {
  apps: [
    {
      name: 'humango-app',
      // В режиме standalone Next.js генерирует отдельный сервер. 
      // Запуск должен производиться через node из папки standalone.
      script: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://bot_user:Web3p00d123@localhost:5432/humango_db',
        GEMINI_API_KEY: 'AIzaSyA4BC-KiMnz_XVmIns4W5JuzTUqgWebEvU',
        GOOGLE_API_KEY: 'AIzaSyA4BC-KiMnz_XVmIns4W5JuzTUqgWebEvU',
        NEXT_PUBLIC_BASE_URL: 'https://bot.humango.app'
      }
    },
    {
      name: 'humango-worker',
      // Используем бинарный файл tsx из папки .bin для надежного запуска TS-скриптов
      script: './node_modules/.bin/tsx',
      args: 'src/scripts/worker.ts',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://bot_user:Web3p00d123@localhost:5432/humango_db',
        GEMINI_API_KEY: 'AIzaSyA4BC-KiMnz_XVmIns4W5JuzTUqgWebEvU',
        GOOGLE_API_KEY: 'AIzaSyA4BC-KiMnz_XVmIns4W5JuzTUqgWebEvU',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 587,
        SMTP_USER: 'abuse@humango.app',
        SMTP_PASS: 'mQ0c33Yn!W6i' // Убедитесь, что это "Пароль приложения" из настроек Google
      }
    }
  ]
};
