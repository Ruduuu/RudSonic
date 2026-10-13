import { NextResponse } from 'next/server';

export const runtime = 'edge';

// ── Sources ───────────────────────────────────────────────────
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';
const ARCHIVE_SEARCH = 'https://archive.org/advancedsearch.php';
const ARCHIVE_META   = 'https://archive.org/metadata';

// Trending music genres (Jamendo)
const TRENDING_MUSIC = [
  { genre: 'Cinematic',    query: 'cinematic epic orchestral' },
  { genre: 'Lofi',         query: 'lofi chill beats study' },
  { genre: 'Ambient',      query: 'ambient peaceful meditation' },
  { genre: 'Electronic',   query: 'electronic synth upbeat' },
  { genre: 'Motivational', query: 'motivational uplifting corporate' },
];

// Trending SFX queries (Internet Archive)
const TRENDING_SFX_QUERIES = [
  'whoosh transition sound effect',
  'cinematic impact boom sound effect',
  'ui notification click beep',
  'rain ambience loop background',
  'riser tension buildup sound effect',
];

export async function GET() {
  const JAMENDO_ID = process.env.JAMENDO_CLIENT_ID ?? '';

  // ── Fetch trending Music via Jamendo ───────────────────────
  const musicFetches = TRENDING_MUSIC.map(async ({ genre, query }) => {
    const params = new URLSearchParams({
      client_id: JAMENDO_ID,
      format: 'json',
      limit: '6',
      namesearch: query,
      include: 'musicinfo',
      audioformat: 'mp31',
      imagesize: '200',
      order: 'popularity_total',
    });
    try {
      const res = await fetch(`${JAMENDO_BASE}/tracks/?${params}`, { next: { revalidate: 3600 } });
      const data = await res.json();
      return (data.results ?? []).slice(0, 6).map((t: Record<string, unknown>) => ({
        id: String(t.id),
        title: t.name,
        artist: t.artist_name,
        duration: t.duration,
        genre,
        previewUrl: t.audio,
        imageUrl: t.image,
        license: 'CC-BY',
        source: 'jamendo',
        trending: true,
      }));
    } catch { return []; }
  });

  // ── Fetch trending SFX via Internet Archive ───────────────
  const sfxFetches = TRENDING_SFX_QUERIES.map(async (query) => {
    // Step 1: search
    const params = new URLSearchParams();
    params.set('q', `(${query}) AND mediatype:audio AND licenseurl:*creativecommons*`);
    params.set('output', 'json');
    params.set('rows', '5');
    params.set('start', '0');
    params.append('fl[]', 'identifier');
    params.append('fl[]', 'title');
    params.append('fl[]', 'creator');
    params.append('fl[]', 'downloads');
    params.append('sort[]', 'downloads desc');

    try {
      const searchRes = await fetch(`${ARCHIVE_SEARCH}?${params}`, { next: { revalidate: 3600 } });
      const searchData = await searchRes.json();
      const docs: Array<{ identifier: string; title: string; creator?: string; downloads?: number }> =
        searchData.response?.docs ?? [];

      // Step 2: get audio URLs
      const metaFetches = docs.map(async (doc) => {
        try {
          const metaRes = await fetch(`${ARCHIVE_META}/${doc.identifier}`, { next: { revalidate: 3600 } });
          const meta = await metaRes.json();
          const files: Array<{ name: string; format?: string; source?: string; length?: string }> = meta.files ?? [];
          const audioFile =
            files.find(f => f.name.endsWith('.mp3') && f.source === 'original') ??
            files.find(f => f.name.endsWith('.mp3')) ??
            files.find(f => f.name.endsWith('.ogg'));
          if (!audioFile) return null;
          const server = meta.server ?? 'archive.org';
          const dir    = meta.dir    ?? `/download/${doc.identifier}`;
          return {
            id:         doc.identifier,
            name:       doc.title || doc.identifier,
            duration:   Math.round(parseFloat(audioFile.length ?? '0') * 10) / 10,
            previewUrl: `https://${server}${dir}/${encodeURIComponent(audioFile.name)}`,
            waveformUrl:'',
            license:    'CC',
            author:     doc.creator || 'Archive.org',
            source:     'archive',
            trending:   true,
          };
        } catch { return null; }
      });

      return (await Promise.all(metaFetches)).filter(Boolean);
    } catch { return []; }
  });

  const [musicResults, sfxResults] = await Promise.all([
    Promise.all(musicFetches),
    Promise.all(sfxFetches),
  ]);

  return NextResponse.json({
    music: musicResults.flat(),
    sfx:   (sfxResults.flat() as unknown[]).filter(Boolean),
    updatedAt: new Date().toISOString(),
  });
}
