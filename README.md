# NIGHTBITE — Discord Moderation & Ticket Bot

Bot architecture, permissions, commands, ticket system, and deployment ready for production:

- Full moderation suite with audit trails
- Advanced ticket system with intake modals and persistent state
- All commands work as slash and prefix (n!)
- Role hierarchy protection and scoped staff permissions
- Docker-ready with SQLite database
- Clean design, 0 raw stack traces to users

## Quick Start

```bash
# 1. Clone and cd into the repo
cd nightbite

# 2. Install dependencies
docker compose up -d
```

The bot will be accessible at the invite link generated in `.env` after you fill in `DISCORD_TOKEN` and `CLIENT_ID`.

## Features

### Moderation
- Ban, kick, timeout, unmute, warn, softban
- Clear/purge with filters, lock/unlock, slowmode
- Nickname management, role assignment/restriction
- Case history and mod-log management

### Tickets
- Category-based ticket panels with intake modals
- Claim/unclaim, add/remove members, priority changes
- Transcript generation and rating system
- Auto-close on inactivity, blacklist management

### Fun & Utility
- 8ball, cat/dog/fox/duck image commands, joke, meme
- HTTP Cat for response codes

All commands respect per-guild permissions, role hierarchy, and are fully tested.

## Commands

See `src/commands/` for all available commands, each with both `/command` and `n!command` variants.