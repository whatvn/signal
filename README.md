# Signal

![Signal Dashboard](./image/signal.png)

Signal is a social media listening dashboard that collects posts and reviews from TikTok, Threads, Facebook, the App Store, and Google Play. It uses an OpenAI-compatible LLM to classify each item by sentiment and issue type, then shows results in a real-time dashboard.

It helps teams monitor common categories like fraud or scams, app bugs, transaction failures, and positive feature feedback. Alerts are triggered when a subcategory spikes past a configured threshold within a time window.

Data collection runs automatically twice a day, at 08:00 and 20:00, for every active monitoring profile. Profiles define what to track, including TikTok keywords or hashtags, Threads keywords, Facebook page URLs, App Store app IDs, and Google Play package IDs.

The app is built with Next.js 14, SQLite with Drizzle ORM, `better-sqlite3`, `node-cron`, and server-sent events for live classification updates. It supports any OpenAI-compatible LLM endpoint through environment variables such as `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `LLM_MODEL`.

For local development, install dependencies, run database migrations, optionally seed sample data, then start the dev server at `http://localhost:3000`.

Deployment is handled by `deploy.sh`, which backs up the live database, builds the app and Docker image, pushes it to VNGCloud Container Registry, and creates or updates the AgentBase runtime. The SQLite database is stored on a persistent `/data` volume so data survives redeployments.
