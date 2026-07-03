# Nightclip

Nightclip is a professional, lightweight Discord moderation and ticket bot. It's built with Node.js and discord.js v14, backed by an SQLite database via Prisma.

## Features

- **Hybrid Commands:** Works flawlessly with both Slash Commands (`/`) and Prefix Commands (`n!`).
- **Advanced Ticket System:** Similar to Tickets V2. Supports interactive panel setup, intake questions, claiming, priorities, HTML transcripts, and staff ratings.
- **Full Moderation Suite:** Ban, kick, timeout, warn, purge, lock, slowmode, and more, with role-hierarchy protections.
- **Extensive Mod-Logs:** Every action is recorded as a Case in the database and logged to a designated channel.
- **Fun Commands:** Free API integrations for cats, dogs, foxes, ducks, memes, 8ball, and jokes.
- **Configurable Permissions:** Supports role-based and user-based permission scopes.

## Prerequisites

- Docker and Docker Compose
- A Discord Bot Token & Client ID (created at the [Discord Developer Portal](https://discord.com/developers/applications))

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repo-url> nightclip
   cd nightclip
   ```

2. **Configure Environment Variables:**
   Rename `.env.example` to `.env` and fill in your details:
   ```bash
   cp .env.example .env
   # Edit .env using nano or your preferred editor
   ```

3. **Deploy via Docker Compose:**
   The easiest way to run Nightclip is via Docker. This will automatically install dependencies, run database migrations, and start the bot.
   ```bash
   docker compose up -d
   ```

4. **Invite the Bot:**
   Go to the Discord Developer portal and generate an OAuth2 invite link with the `bot` and `applications.commands` scopes. Ensure it has `Administrator` permission for seamless operation.

## In-Server Configuration

Once the bot is in your server, the Bot Owner or Server Administrator can use the following commands to configure it:

- `/config prefix set:<value>`: Change the bot's prefix.
- `/config modlog channel:#channel`: Set the channel for moderation case logs.
- `/config ticketlog channel:#channel`: Set the channel for ticket transcripts.
- `/permissions add-role role:@role scope:all`: Grant a role staff permissions.
- `/ticket-panel setup`: Interactively create a ticket category and post the panel.

## Updating

To update Nightclip to the latest version:
```bash
git pull
docker compose pull
docker compose up -d --build
```

## Architecture

- **Database:** SQLite (living in the `./data` volume) mapped via Prisma. Easily scalable to PostgreSQL by uncommenting the relevant block in `docker-compose.yml` and updating `schema.prisma`.
- **Transcripts:** Stored alongside the SQLite DB and delivered securely via Discord attachments.
