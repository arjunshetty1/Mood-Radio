import { type NextRequest, NextResponse } from "next/server"
import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Spotify token management
let accessToken: string = ""   
let tokenExpiry = 0

async function getSpotifyToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("Spotify credentials not configured")
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    throw new Error("Failed to get Spotify token")
  }

  const data = await response.json()
  accessToken = data.access_token
  tokenExpiry = Date.now() + data.expires_in * 1000

  return accessToken
}

async function mapVibeToGenres(vibe: string): Promise<string[]> {
  const prompt = `User vibe: "${vibe}"

Based on this vibe, suggest 3-5 Spotify genres from this list:
rock, pop, jazz, classical, metal, hip-hop, electronic, indie, blues, folk, soul, reggae, country, r-n-b, funk, punk, alternative, dance, house, techno, ambient, chill, acoustic, latin, world-music

Consider the mood, energy level, and context. Return only the genre names separated by commas, no explanations.`

  try {
      const { text } = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        prompt,
      })

    return text
      .trim()
      .split(",")
      .map((g) => g.trim())
      .slice(0, 5)
  } catch (error) {
    console.error("AI genre mapping failed:", error)
    // Fallback genres based on common vibes
    if (vibe.toLowerCase().includes("chill") || vibe.toLowerCase().includes("relax")) {
      return ["chill", "ambient", "acoustic"]
    }
    if (vibe.toLowerCase().includes("energy") || vibe.toLowerCase().includes("workout")) {
      return ["electronic", "dance", "pop"]
    }
    return ["pop", "indie", "alternative"] // Safe default
  }
}

async function getSpotifyRecommendations(genres: string[], vibe: string) {
  const token = await getSpotifyToken()

  // Map vibe to audio features
  let energy = 0.5
  let valence = 0.5
  let danceability = 0.5

  const vibeLower = vibe.toLowerCase()

  // Energy mapping
  if (vibeLower.includes("high energy") || vibeLower.includes("workout") || vibeLower.includes("pumped")) {
    energy = 0.8
  } else if (vibeLower.includes("chill") || vibeLower.includes("relax") || vibeLower.includes("calm")) {
    energy = 0.3
  }

  // Valence (happiness) mapping
  if (vibeLower.includes("happy") || vibeLower.includes("upbeat") || vibeLower.includes("celebration")) {
    valence = 0.8
  } else if (vibeLower.includes("sad") || vibeLower.includes("melancholy") || vibeLower.includes("nostalgic")) {
    valence = 0.2
  }

  // Danceability mapping
  if (vibeLower.includes("dance") || vibeLower.includes("party") || vibeLower.includes("club")) {
    danceability = 0.8
  }

  const params = new URLSearchParams({
    seed_genres: genres.slice(0, 5).join(","),
    limit: "20",
    target_energy: energy.toString(),
    target_valence: valence.toString(),
    target_danceability: danceability.toString(),
  })

  const response = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to get Spotify recommendations")
  }

  const data = await response.json()

  return data.tracks.map((track: any) => ({
    name: track.name,
    artist: track.artists.map((a: any) => a.name).join(", "),
    url: track.external_urls.spotify,
    preview_url: track.preview_url,
    image: track.album.images[0]?.url,
  }))
}

export async function POST(request: NextRequest) {
  try {
    const { vibe } = await request.json()

    if (!vibe || typeof vibe !== "string") {
      return NextResponse.json({ error: "Vibe is required" }, { status: 400 })
    }

    // Step 1: Map vibe to genres using AI
    const genres = await mapVibeToGenres(vibe)
    console.log("[v0] Mapped genres:", genres)

    // Step 2: Get Spotify recommendations
    const tracks = await getSpotifyRecommendations(genres, vibe)
    console.log("[v0] Found tracks:", tracks.length)

    return NextResponse.json({
      tracks: tracks.slice(0, 10), // Return top 10 tracks
      genres,
      vibe,
    })
  } catch (error) {
    console.error("[v0] Playlist generation error:", error)

    if (error instanceof Error && error.message.includes("Spotify credentials")) {
      return NextResponse.json(
        {
          error:
            "Spotify integration not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.",
          needsSetup: true,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: "Failed to generate playlist" }, { status: 500 })
  }
}
