# HKS (Higher Keys System)

A sophisticated media processing and curation platform designed to convert content consumers into creators and curators.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **FFmpeg** (installed on system)
- **Supabase** account

### Local Development

1. **Clone the repository**:

   ```bash
   git clone <repo-url>
   cd hks
   ```

2. **Setup Media Server (Backend)**:

   ```bash
   cd media
   make install
   # Create .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   make dev
   ```

3. **Setup Web App (Frontend)**:

   ```bash
   cd web
   npm install
   # Create .env with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, MEDIA_SERVER_URL
   npm run dev
   ```

## 📚 Documentation

- **[System Architecture](docs/architecture.md)**: Detailed overview of the distributed system and data flow.
- **[Production Deployment](docs/production_setup.md)**: Step-by-step guide for deploying to GCP/Ubuntu.
- **[Media Server API](media/main.py)**: FastAPI Swagger docs available at `/docs` on the running server.
- **[Keyboard Controls](docs/uis/controls.md)**: Full guide to application shortcuts.

## ⌨️ Keyboard Quick Reference

| Context | I Key | P Key |
| :--- | :--- | :--- |
| **Global** | Profile Menu (Logged in only) | — |
| **Dashboard** | Profile Menu | Playlists Manager |
| **Highlighter** | Profile Menu | — |
| **Playlist Player** | Profile Menu | — |
| **Higher Key Manager** | Profile Menu | Breakout Playlist (Launch sequence) |

## 🛠️ Tech Stack

- **Frontend**: Next.js, Tailwind CSS, Shadcn UI, React Query.
- **Backend**: FastAPI, FFmpeg, Vosk (STT), yt-dlp.
- **Infrastructure**: Supabase (DB, Auth, Storage), GCP (Media Processing).

## 📝 License

MIT
# higherkeys
