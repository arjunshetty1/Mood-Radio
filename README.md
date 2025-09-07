# AI Mood Radio 🎵

Transform your vibes into personalized playlists using AI-powered music discovery.

## Setup

1. **Spotify API Setup**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Copy your `Client ID` and `Client Secret`

2. **Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Add your Spotify credentials:
     \`\`\`
     SPOTIFY_CLIENT_ID=your_client_id_here
     SPOTIFY_CLIENT_SECRET=your_client_secret_here
     \`\`\`

3. **Run the App**
   \`\`\`bash
   npm run dev
   \`\`\`

## How it Works

1. Enter your mood or vibe (e.g., "coding like a monster", "rainy evening vibes")
2. AI analyzes your input and maps it to music genres and characteristics
3. Spotify API generates personalized recommendations
4. Discover new music that matches your exact mood

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **AI**: Groq (for vibe-to-genre mapping)
- **Music**: Spotify Web API
- **Styling**: Mobile-first responsive design
