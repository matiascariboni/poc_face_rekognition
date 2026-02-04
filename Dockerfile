# Use Node.js image with pnpm preinstalled
FROM node:22-alpine3.22

# Install pnpm globally via corepack (built into Node.js 16.9+)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install nano and bash
RUN apk update && apk add nano bash

# Setup the workdir, copy files and install modules
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# Exposing ports
EXPOSE 3000
# TO 3456

# Run code
CMD ["pnpm", "run", "start"]