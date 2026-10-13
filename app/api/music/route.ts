import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';
const CLIENT_ID = process.env.JAMENDO_CLIENT_ID ?? '';

// Map our genre names to Jamendo tags
const GENRE_TAG_MAP: Record<string, string> = {
  cinematic: 'cinematicorchestral',
  ambient: 'ambient',
  lofi: 'lofi',
  hiphop: 'hiphop',
  electronic: 'electronic',
  corporate: 'corporate',
  pop: 'pop',
  jazz: 'jazz',
  rock: 'rock',
  emotional: 'emotional',
  motivational: 'motivational',
  travel: 'travel',
  wedding: 'acoustic',
  documentary: 'documentary',
  vlog: 'vlog',
};

// Map mood to Jamendo vocalinstrumental / acousticelectric params
const MOOD_TAG_MAP: Record<string, string> = {
  happy: 'happy',
  sad: 'sad',
  epic: 'epic',
  dark: 'dark',
  chill: 'chill',
  romantic: 'romantic',
  energetic: 'energetic',
  peaceful: 'relaxing',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') ?? '';
  const genre = searchParams.get('genre') ?? '';
  const mood = searchParams.get('mood') ?? '';
  const bpmMin = searchParams.get('bpmMin') ?? '60';
  const bpmMax = searchParams.get('bpmMax') ?? '200';
  const durationMax = searchParams.get('durationMax') ?? '600';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = 30;

  // Build Jamendo tag filter
  const tags: string[] = [];
  if (genre && GENRE_TAG_MAP[genre.toLowerCase()]) {
    tags.push(GENRE_TAG_MAP[genre.toLowerCase()]);
  }
  if (mood && MOOD_TAG_MAP[mood.toLowerCase()]) {
    tags.push(MOOD_TAG_MAP[mood.toLowerCase()]);
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    format: 'json',
    limit: String(limit),
    offset: String((page - 1) * limit),
    include: 'musicinfo+stats',
    audioformat: 'mp31',
    imagesize: '200',
  });

  // Search term
  if (q) params.set('namesearch', q);

  // Genre/mood as tags
  if (tags.length > 0) params.set('tags', tags.join('+'));

  // BPM filter
  if (bpmMin !== '60' || bpmMax !== '200') {
    params.set('bpmmin', bpmMin);
    params.set('bpmmax', bpmMax);
  }

  // Duration filter (seconds)
  params.set('durationbetween', `1_${durationMax}`);

  // Order by popularity if no query
  if (!q) params.set('order', 'popularity_total');

  try {
    const url = `${JAMENDO_BASE}/tracks/?${params.toString()}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      return NextResponse.json({ error: 'Jamendo API error', status: res.status }, { status: 502 });
    }

    const data = await res.json();
    const tracks = (data.results ?? []).map((t: JamendoTrack) => ({
      id: String(t.id),
      title: t.name,
      artist: t.artist_name,
      album: t.album_name,
      duration: t.duration, // seconds
      bpm: t.musicinfo?.tempo ?? null,
      genre: t.musicinfo?.tags?.genres?.[0] ?? genre ?? 'Music',
      mood: t.musicinfo?.tags?.vartags?.[0] ?? mood ?? '',
      previewUrl: t.audio,          // Jamendo audio stream (MP3)
      imageUrl: t.image,
      license: t.license_ccurl?.includes('by') ? 'CC-BY' : 'CC0',
      licenseUrl: t.license_ccurl,
      source: 'jamendo',
      jamendoUrl: t.shareurl,
    }));

    return NextResponse.json({
      results: tracks,
      total: data.headers?.results_count ?? tracks.length,
      page,
      limit,
    });
  } catch (err) {
    console.error('[/api/music] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Types ─────────────────────────────────────────────────────
interface JamendoTrack {
  id: number;
  name: string;
  duration: number;
  artist_name: string;
  artist_id: string;
  album_name: string;
  album_id: string;
  audio: string;
  audiodownload: string;
  image: string;
  shareurl: string;
  license_ccurl: string;
  musicinfo?: {
    tempo?: number;
    tags?: {
      genres?: string[];
      vartags?: string[];
    };
  };
}
