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

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Spotify token error:", response.status, errorText)
      throw new Error(`Failed to get Spotify token: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    accessToken = data.access_token
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000 // Subtract 60s buffer

    console.log("[v0] Spotify token obtained successfully")
    return accessToken
  } catch (error) {
    console.error("[v0] Error getting Spotify token:", error)
    throw error
  }
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

    const genres = text
      .trim()
      .split(",")
      .map((g) => g.trim())
      .filter(g => g.length > 0)
      .slice(0, 5)
    
    console.log("[v0] AI mapped genres:", genres)
    return genres.length > 0 ? genres : ["pop", "indie", "alternative"] // Ensure we have genres
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

// Validate Spotify genres against their available seed genres
const VALID_SPOTIFY_GENRES = [
  'acoustic', 'afrobeat', 'alt-rock', 'alternative', 'ambient', 'ancient', 
  'arabic', 'blues', 'bossanova', 'brazil', 'breakbeat', 'british', 
  'chill', 'classical', 'club', 'country', 'dance', 'deep-house', 
  'disco', 'drum-and-bass', 'dub', 'dubstep', 'electronic', 'folk', 
  'funk', 'garage', 'gospel', 'groove', 'grunge', 'hip-hop', 'house', 
  'indie', 'jazz', 'latin', 'metal', 'pop', 'punk', 'r-n-b', 'reggae', 
  'rock', 'soul', 'techno', 'world-music'
]

function validateAndFixGenres(genres: string[]): string[] {
  const validGenres = genres
    .map(genre => {
      const normalized = genre.toLowerCase().trim()
      // Handle common mappings
      if (normalized === 'rnb' || normalized === 'r&b') return 'r-n-b'
      if (normalized === 'hiphop' || normalized === 'hip hop') return 'hip-hop'
      if (normalized === 'edm') return 'electronic'
      return normalized
    })
    .filter(genre => VALID_SPOTIFY_GENRES.includes(genre))

  // Ensure we have at least one valid genre
  if (validGenres.length === 0) {
    return ['pop']
  }

  return validGenres.slice(0, 5) // Spotify allows max 5 seed genres
}

async function getSpotifyRecommendations(genres: string[], vibe: string) {
  const token = await getSpotifyToken()

  // Validate genres first
  const validGenres = validateAndFixGenres(genres)
  console.log("[v0] Valid genres for Spotify:", validGenres)

  // Map vibe to audio features (keep values in valid ranges)
  let energy = 0.5
  let valence = 0.5
  let danceability = 0.5

  const vibeLower = vibe.toLowerCase()

  // Energy mapping (0.0 to 1.0)
  if (vibeLower.includes("high energy") || vibeLower.includes("workout") || vibeLower.includes("pumped")) {
    energy = 0.8
  } else if (vibeLower.includes("chill") || vibeLower.includes("relax") || vibeLower.includes("calm")) {
    energy = 0.3
  }

  // Valence (happiness) mapping (0.0 to 1.0)
  if (vibeLower.includes("happy") || vibeLower.includes("upbeat") || vibeLower.includes("celebration")) {
    valence = 0.8
  } else if (vibeLower.includes("sad") || vibeLower.includes("melancholy") || vibeLower.includes("nostalgic")) {
    valence = 0.2
  }

  // Danceability mapping (0.0 to 1.0)
  if (vibeLower.includes("dance") || vibeLower.includes("party") || vibeLower.includes("club")) {
    danceability = 0.8
  }

  const params = new URLSearchParams({
    seed_genres: validGenres.join(","),
    limit: "20",
    target_energy: energy.toFixed(2),
    target_valence: valence.toFixed(2),
    target_danceability: danceability.toFixed(2),
  })

  console.log("[v0] Spotify API request URL:", `https://api.spotify.com/v1/recommendations?${params.toString()}`)

  try {
    const response = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    console.log("[v0] Spotify recommendations response status:", response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Spotify recommendations error:", response.status, errorText)
      throw new Error(`Spotify API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log("[v0] Spotify response data structure:", {
      hasracks: !!data.tracks,
      tracksLength: data.tracks?.length,
      firstTrack: data.tracks?.[0]?.name
    })

    if (!data.tracks || data.tracks.length === 0) {
      console.warn("[v0] No tracks returned from Spotify")
      return []
    }

    return data.tracks.map((track: any) => ({
      name: track.name,
      artist: track.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist",
      url: track.external_urls?.spotify || "",
      preview_url: track.preview_url,
      image: track.album?.images?.[0]?.url || null,
    }))
  } catch (error) {
    console.error("[v0] Error fetching Spotify recommendations:", error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting playlist generation request")
    
    const body = await request.json()
    const { vibe } = body

    console.log("[v0] Received vibe:", vibe)

    if (!vibe || typeof vibe !== "string" || vibe.trim().length === 0) {
      return NextResponse.json({ error: "Valid vibe is required" }, { status: 400 })
    }

    // Check environment variables
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      console.error("[v0] Missing Spotify credentials")
      return NextResponse.json(
        {
          error: "Spotify integration not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.",
          needsSetup: true,
        },
        { status: 500 }
      )
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("[v0] Missing GROQ API key")
      return NextResponse.json(
        { error: "GROQ API key not configured" },
        { status: 500 }
      )
    }

    // Step 1: Map vibe to genres using AI
    console.log("[v0] Mapping vibe to genres...")
    const genres = await mapVibeToGenres(vibe.trim())
    console.log("[v0] Mapped genres:", genres)

    // Step 2: Get Spotify recommendations
    console.log("[v0] Fetching Spotify recommendations...")
    const tracks = await getSpotifyRecommendations(genres, vibe.trim())
    console.log("[v0] Found tracks:", tracks.length)

    if (tracks.length === 0) {
      return NextResponse.json({
        error: "No tracks found for this vibe. Try a different description.",
        tracks: [],
        genres,
        vibe: vibe.trim(),
      }, { status: 200 })
    }

    return NextResponse.json({
      tracks: tracks.slice(0, 10), // Return top 10 tracks
      genres,
      vibe: vibe.trim(),
    })
  } catch (error) {
    console.error("[v0] Playlist generation error:", error)

    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes("Spotify credentials")) {
        return NextResponse.json(
          {
            error: "Spotify integration not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.",
            needsSetup: true,
          },
          { status: 500 }
        )
      }
      
      if (error.message.includes("Spotify API error")) {
        return NextResponse.json(
          { error: `Spotify API issue: ${error.message}` },
          { status: 500 }
        )
      }

      if (error.message.includes("AI genre mapping failed")) {
        return NextResponse.json(
          { error: "AI service unavailable. Please try again later." },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: "Failed to generate playlist. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
}