import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// ── Jamendo API v3 ───────────────────────────────────────────
// Docs: https://developer.jamendo.com/v3.0/tracks
// Free, CC-licensed music. 600,000+ tracks.

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

// MUSIC DURATION HARD LIMIT: 5 minutes = 300 seconds
const MUSIC_MAX_DURATION = 300;

// Map mood UI names → Jamendo vartags
const MOOD_TAGS: Record<string, string> = {
  cinematic:    'cinematic epic orchestral dramatic score',
  lofi:         'lofi chill lo-fi beats study relaxing',
  ambient:      'ambient atmospheric peaceful meditative space',
  motivational: 'motivational uplifting inspiring corporate',
  emotional:    'emotional sad melancholic touching heartfelt',
  happy:        'happy joyful upbeat cheerful fun',
  dark:         'dark suspense tension thriller noir',
  romantic:     'romantic love wedding gentle',
};

// Map genre chip names → Jamendo tags
const GENRE_TAGS: Record<string, string> = {
  cinematic:    'cinematic',
  lofi:         'lofi',
  ambient:      'ambient',
  electronic:   'electronic',
  jazz:         'jazz',
  rock:         'rock',
  pop:          'pop',
  hiphop:       'hiphop',
  classical:    'classical',
  funk:         'funk',
  acoustic:     'acoustic',
  bgm:          'background instrumental film',
  vlog:         'vlog travel upbeat energetic',
  wedding:      'wedding romantic love',
  documentary:  'documentary nature ambient cinematic',
  ads:          'corporate upbeat motivational advertising',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q           = searchParams.get('q') ?? '';
  const genre       = searchParams.get('genre') ?? '';
  const mood        = searchParams.get('mood') ?? '';
  const durationMax = Math.min(
    parseInt(searchParams.get('durationMax') ?? String(MUSIC_MAX_DURATION), 10),
    MUSIC_MAX_DURATION // never exceed 5 min regardless of what client sends
  );
  const page    = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage = 30;
  const offset  = (page - 1) * perPage;

  const CLIENT_ID = process.env.JAMENDO_CLIENT_ID ?? '';

  // ── Build Jamendo parameters ───────────────────────────────
  const params = new URLSearchParams({
    client_id:   CLIENT_ID,
    format:      'json',
    limit:       String(perPage),
    offset:      String(offset),
    audioformat: 'mp31',
    imagesize:   '200',
    include:     'musicinfo',
    order:       'popularity_total',
    // HARD: max 5 minutes, min 10 seconds (avoids tiny jingles in music)
    durationbetween: `10_${durationMax}`,
  });

  // Text search
  if (q) params.set('namesearch', q);

  // Genre filter
  if (genre && GENRE_TAGS[genre.toLowerCase()]) {
    params.set('tags', GENRE_TAGS[genre.toLowerCase()]);
  } else if (genre) {
    params.set('tags', genre);
  }

  // Mood filter (uses fuzzytags on Jamendo)
  if (mood && MOOD_TAGS[mood.toLowerCase()]) {
    params.set('fuzzytags', MOOD_TAGS[mood.toLowerCase()]);
  }

  try {
    const url = `${JAMENDO_BASE}/tracks/?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Jamendo API error', status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();
    const tracks: JamendoTrack[] = data.results ?? [];
    const total: number          = data.headers?.results_fullcount ?? tracks.length;

    // ── HARD FILTER: duration 10–300 seconds ─────────────────
    const results = tracks
      .filter(t => {
        const d = Number(t.duration);
        return !isNaN(d) && d >= 10 && d <= MUSIC_MAX_DURATION;
      })
      .map(t => _normalize(t));

    return NextResponse.json({
      results,
      total,
      page,
      pageSize: perPage,
      nextPage: offset + perPage < total ? page + 1 : null,
    });
  } catch (err) {
    console.error('[/api/music] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Normalise Jamendo track → RudSonic Music format ───────────
function _normalize(t: JamendoTrack) {
  const dur = Number(t.duration);
  return {
    id:          String(t.id),
    title:       t.name || 'Untitled',
    artist:      t.artist_name || 'Unknown Artist',
    album:       t.album_name  || '',
    duration:    isNaN(dur) ? 0 : dur,                // seconds
    bpm:         t.musicinfo?.speed ?? null,
    genre:       t.musicinfo?.tags?.genres?.[0] ?? '',
    mood:        t.musicinfo?.tags?.vartags?.[0] ?? '',
    previewUrl:  t.audio,                             // streaming MP3
    imageUrl:    t.image,
    license:     _license(t.license_ccurl),
    licenseUrl:  t.license_ccurl,
    source:      'jamendo',
    jamendoUrl:  t.shareurl ?? `https://www.jamendo.com/track/${t.id}`,
  };
}

function _license(url?: string): string {
  if (!url) return 'CC-BY';
  if (url.includes('publicdomain') || url.includes('zero')) return 'CC0';
  if (url.includes('by-nc-nd')) return 'CC-BY-NC-ND';
  if (url.includes('by-nc-sa')) return 'CC-BY-NC-SA';
  if (url.includes('by-nc'))    return 'CC-BY-NC';
  if (url.includes('by-sa'))    return 'CC-BY-SA';
  if (url.includes('by-nd'))    return 'CC-BY-ND';
  return 'CC-BY';
}

// ── Jamendo API types ─────────────────────────────────────────
interface JamendoTrack {
  id:            number | string;
  name?:         string;
  artist_name?:  string;
  album_name?:   string;
  duration?:     number | string;
  audio?:        string;
  image?:        string;
  shareurl?:     string;
  license_ccurl?:string;
  musicinfo?: {
    speed?:  string;
    tags?: {
      genres?:  string[];
      vartags?: string[];
    };
  };
}
