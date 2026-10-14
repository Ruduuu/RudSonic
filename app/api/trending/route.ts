import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Trending: cached for 1 hour at Vercel edge
// Music: Jamendo — 600k+ CC tracks, max 5 min (300s)
// SFX:   API League (Pixabay-backed) — 50k+ CC0 sounds, max 30s

const JAMENDO_BASE   = 'https://api.jamendo.com/v3.0';
const API_LEAGUE_URL = 'https://api.apileague.com/search-sound-effects';

const MUSIC_MAX_DURATION = 300; // 5 minutes
const SFX_MAX_DURATION   = 30;  // 30 seconds

// ── Trending music buckets (one per genre) ─────────────────────
const TRENDING_MUSIC = [
  { genre: 'Cinematic',    tags: 'cinematic epic dramatic' },
  { genre: 'Lofi',         tags: 'lofi chill beats' },
  { genre: 'Ambient',      tags: 'ambient peaceful atmospheric' },
  { genre: 'Electronic',   tags: 'electronic synth upbeat' },
  { genre: 'Motivational', tags: 'motivational uplifting inspiring' },
  { genre: 'BGM',          tags: 'background instrumental film' },
  { genre: 'Funk',         tags: 'funk groove bass' },
  { genre: 'Jazz',         tags: 'jazz smooth piano' },
];

// ── Trending SFX queries ────────────────────────────────────────
const TRENDING_SFX = [
  'whoosh transition',
  'impact hit boom',
  'ui notification click',
  'riser buildup',
  'nature rain wind',
  'typing keyboard',
  'clock ticking',
  'city traffic crowd',
];

export async function GET() {
  const JAMENDO_ID    = process.env.JAMENDO_CLIENT_ID ?? '';
  const API_LEAGUE_KEY = process.env.API_LEAGUE_KEY    ?? '';

  // ── Fetch music buckets (parallel) ────────────────────────
  const musicFetches = TRENDING_MUSIC.map(async ({ genre, tags }) => {
    const params = new URLSearchParams({
      client_id:       JAMENDO_ID,
      format:          'json',
      limit:           '6',
      audioformat:     'mp31',
      imagesize:       '200',
      include:         'musicinfo',
      order:           'popularity_total',
      tags,
      durationbetween: `10_${MUSIC_MAX_DURATION}`, // 10s–5min
    });
    try {
      const res = await fetch(`${JAMENDO_BASE}/tracks/?${params}`, {
        next: { revalidate: 3600 },
      });
      const data = await res.json();
      return (data.results ?? [])
        .filter((t: { duration?: number | string }) => {
          const d = Number(t.duration);
          return !isNaN(d) && d >= 10 && d <= MUSIC_MAX_DURATION;
        })
        .slice(0, 6)
        .map((t: Record<string, unknown>) => ({
          id:         String(t.id),
          title:      t.name,
          artist:     t.artist_name,
          duration:   Number(t.duration),
          genre,
          previewUrl: t.audio,
          imageUrl:   t.image,
          license:    'CC-BY',
          source:     'jamendo',
          trending:   true,
        }));
    } catch { return []; }
  });

  // ── Fetch SFX buckets (parallel) ──────────────────────────
  const sfxFetches = TRENDING_SFX.map(async (query) => {
    const params = new URLSearchParams({
      query,
      number: '5',
      offset: '0',
    });
    try {
      const res = await fetch(`${API_LEAGUE_URL}?${params}`, {
        headers: { 'x-api-key': API_LEAGUE_KEY },
        next:    { revalidate: 3600 },
      });
      const data = await res.json();
      return (data.sounds ?? [])
        .filter((s: { duration?: number | string }) => {
          const d = Number(s.duration);
          return !isNaN(d) && d > 0 && d <= SFX_MAX_DURATION;
        })
        .slice(0, 5)
        .map((s: Record<string, unknown>) => ({
          id:         String(s.id ?? s.url),
          name:       s.title || (String(s.tags ?? '').split(',')[0].trim()) || 'Sound',
          duration:   Math.round(Number(s.duration) * 10) / 10,
          tags:       String(s.tags ?? '').split(',').map((x: string) => x.trim()).slice(0, 5),
          previewUrl: s.url,
          waveformUrl:'',
          license:    'CC0',
          author:     s.user || 'Pixabay',
          source:     'apileague',
          trending:   true,
        }));
    } catch { return []; }
  });

  const [musicResults, sfxResults] = await Promise.all([
    Promise.all(musicFetches),
    Promise.all(sfxFetches),
  ]);

  return NextResponse.json(
    {
      music: musicResults.flat(),
      sfx:   sfxResults.flat().filter(Boolean),
      meta: {
        musicMaxDuration: MUSIC_MAX_DURATION,
        sfxMaxDuration:   SFX_MAX_DURATION,
        updatedAt:        new Date().toISOString(),
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    }
  );
}
