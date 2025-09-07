"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, ExternalLink, Disc3, Headphones, Radio } from "lucide-react"

interface Song {
  name: string
  artist: string
  url: string
  preview_url?: string
  image?: string
}

export default function Home() {
  const [vibe, setVibe] = useState("")
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const generatePlaylist = async () => {
    if (!vibe.trim()) return

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vibe }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate playlist")
      }

      const data = await response.json()
      setSongs(data.tracks || [])
    } catch (err) {
      setError("Failed to generate playlist. Please try again.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-accent/3 to-secondary/3" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(10,185,129,0.05),transparent_50%)]" />

        <div className="relative container mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-lg" />
                <div className="relative p-2 sm:p-3 bg-card rounded-full border border-border/50 backdrop-blur-sm">
                  <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-4xl lg:text-6xl font-bold text-foreground tracking-tight">
                  Mood<span className="text-primary">Radio</span>
                </h1>
                <div className="flex items-center justify-center gap-1 sm:gap-2 mt-1">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm text-muted-foreground font-medium tracking-wider uppercase">
                    AI Discovery
                  </span>
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                </div>
              </div>
            </div>
            <p className="text-sm sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
              Transform your feelings into the perfect soundtrack. Describe your vibe and discover music that matches
              your mood.
            </p>
          </div>

          <div className="max-w-xl mx-auto mb-8 sm:mb-12">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-5">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <h2 className="text-lg sm:text-xl font-semibold text-card-foreground">What's your vibe?</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">Describe your mood or energy</p>
                  </div>

                  <div className="space-y-3">
                    <Input
                      placeholder="coding energy, rainy vibes, workout mode..."
                      value={vibe}
                      onChange={(e) => setVibe(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && generatePlaylist()}
                      className="h-11 sm:h-12 text-base bg-input border-border/50 focus:border-accent/50 focus:ring-accent/20"
                    />
                    <Button
                      onClick={generatePlaylist}
                      disabled={loading || !vibe.trim()}
                      size="lg"
                      className="w-full h-11 sm:h-12 text-base bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground mr-2" />
                          Curating...
                        </>
                      ) : (
                        <>
                          <Headphones className="w-4 h-4 mr-2" />
                          Generate Playlist
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="max-w-xl mx-auto mb-6 bg-destructive/10 border-destructive/20">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </CardContent>
            </Card>
          )}

          {songs.length > 0 && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">Your Playlist</h3>
                <p className="text-sm text-muted-foreground">
                  {songs.length} tracks for: <span className="text-accent font-medium">"{vibe}"</span>
                </p>
              </div>

              <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-lg">
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-2 sm:space-y-3">
                    {songs.map((song, index) => (
                      <div
                        key={index}
                        className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/30 hover:bg-muted/50 hover:border-accent/30 transition-all duration-200"
                      >
                        <div className="flex-shrink-0 relative">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-accent rounded-md flex items-center justify-center shadow-md">
                            <Disc3 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-accent rounded-full flex items-center justify-center text-xs font-bold text-accent-foreground">
                            {index + 1}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-semibold text-card-foreground truncate group-hover:text-primary transition-colors">
                            {song.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{song.artist}</p>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="opacity-60 group-hover:opacity-100 transition-opacity bg-accent/10 hover:bg-accent hover:text-accent-foreground p-2 h-8 w-8 sm:h-9 sm:w-auto sm:px-3"
                        >
                          <a href={song.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Spotify</span>
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
