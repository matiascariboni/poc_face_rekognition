# Setting node image
FROM node:22-alpine3.22

# Install nano, bash and pnpm using the official standalone script
RUN apk update && apk add nano && apk add bash && \
    wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.shrc" SHELL="$(which sh)" sh -

# Add pnpm to PATH
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Setup the workdir, copy files and install modules
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# Exposing ports. The comment after the port it's mandatory no it's extact format and spaces to set the docker compose on host machine. Set a "TO" port for each port that you want to expose on the host
EXPOSE 3000
# TO 3235

# Run code
CMD ["pnpm", "run", "start"]