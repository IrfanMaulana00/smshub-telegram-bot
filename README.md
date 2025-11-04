## SmsApi — Telegram SMS OTP / Deposit Bot

A small Telegram bot and worker that integrates with an SMS provider (smshub.org) to sell temporary phone numbers / OTP services and handle deposits. It uses Telegraf for the Telegram bot, a MySQL database for user/order data, and a background poller to track order status.

Key features
- Telegram bot with user and admin commands (saldo, deposit, layanan, status, cancel, addsaldo, approve_deposit, setrate)
- Integrates with SMSHub API to allocate numbers and retrieve OTP/status
- Simple MySQL-backed user & order storage (see `db_smsapi.sql`)
- Background poller worker to process and update orders

Getting started

Prerequisites
- Node.js (v16+ recommended)
- MySQL server

Install

Run from project root:

```bash
# install dependencies
npm install

# start in development (auto-restarts with nodemon)
npm run dev

# or run the production entry
npm start
```

Configuration

Copy the example environment file and fill the values:

```bash
cp .env-example .env
# then edit .env
```

Important environment variables (see `.env-example`)
- BOT_TOKEN — Telegram bot token (required)
- ADMIN_IDS — comma-separated Telegram user IDs for admin actions (optional)
- DB_HOST, DB_USER, DB_PASS, DB_NAME — MySQL connection
- USD_IDR — exchange rate used for pricing (default in `.env-example`)
- SMSHUB_API_KEY — your API key for smshub.org (required)
- SMSHUB_API_URL — API endpoint (default: https://smshub.org/stubs/handler_api.php)
- DEFAULT_COUNTRY — default country code for allocations
- POLL_INTERVAL_MS, POLL_BATCH, POLL_GRACE_MS — worker tuning options

Project layout

- `src/` — application code
  - `bot/` — Telegraf bot setup, commands and UI
  - `lib/` — helpers: db, logger, smshub client, telegram wrappers
  - `worker/` — background poller that updates order statuses
  - `config.js` — central config loaded from environment
  - `index.js` — app entrypoint (launches bot and poller)
- `db_smsapi.sql` — SQL schema / sample data for the project
- `bot.js` — (legacy / optional entry) top-level bot script

Bot commands
The bot registers the following commands (as seen in `src/index.js`):

- `/saldo` — check your balance
- `/deposit <nominal>` — request a deposit
- `/layanan` — purchase OTP/temporary number
- `/status <orderId>` — check order/OTP status
- `/cancel <orderId>` — cancel an order
- Admin-only (should be restricted to `ADMIN_IDS`):
  - `/addsaldo` — add user balance
  - `/approve_deposit` — approve a deposit
  - `/setrate` — set the USD to IDR rate

Database

Use the included `db_smsapi.sql` to create the required schema and any sample data. Update `.env` DB_* settings to point to your MySQL instance.

Development notes
- The project is ESM ("type": "module" in `package.json`).
- Main deps: `telegraf`, `axios`, `mysql2`, `dotenv`.
- Dev: `nodemon` for local development.

Troubleshooting
- BOT_TOKEN required: the app will throw an error at startup if missing.
- SMSHUB_API_KEY required: the worker and allocation logic require this key.
- If the bot doesn't respond, ensure your server can reach Telegram and smshub.org, and check `LOG_LEVEL` in `.env`.

Security & notes
- Keep `.env` out of version control. Do not commit secrets.
- Limit `ADMIN_IDS` to trusted Telegram accounts.

Contributing
- Open an issue or PR. Keep changes small and focused.

License
- No license specified. Add a `LICENSE` file if you want to make the project open-source.

Contact
- For questions, open an issue in the repository.

---
Generated README based on repository files and `.env-example`.
