FROM node:20-slim AS base

# Install dependencies for Puppeteer/Chrome
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Non-root user setup
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs

COPY package*.json ./
RUN npm install

COPY . .

# Set permissions
RUN chown -R nextjs:nextjs /app
USER nextjs

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]