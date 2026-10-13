import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// ── Internet Archive API — No API key required ────────────────
const ARCHIVE_SEARCH = 'https://archive.org/advancedsearch.php';
const ARCHIVE_META   = 'https://archive.org/metadata';

// Map our UI categories to Archive.org search queries
const CATEGORY_QUERIES: Record<string, string> = {
  whooshes:        'whoosh swoosh sound effect',
  transitions:     'transition swipe sweep sound effect',
  impacts:         'impact explosion boom punch hit sound effect',
  risers:          'riser build tension suspense sound effect',
  'cinematic-hits':'cinematic hit dramatic score stinger',
  'ui-sounds':     'ui click notification interface button beep blip',
  footsteps:       'footstep walking steps sound effect',
  ambience:        'ambient atmosphere background sound loop',
  nature:          'rain wind forest birds nature sound',
  'sci-fi':        'science fiction futuristic laser space scifi',
  foley:           'foley cloth texture movement sound',
  doors:           'door open close creak squeak',
  vehicles:        'car engine motor vehicle sound effect',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q        = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage  = 20; // Smaller page size: we make 1 metadata call per result

  // Build Archive.org query
  let baseQuery = q;
  if (!baseQuery && category && CATEGORY_QUERIES[category.toLowerCase()]) {
    baseQuery = CATEGORY_QUERIES[category.toLowerCase()];
  } else if (!baseQuery) {
    baseQuery = 'sound effect';
  }

  // Filter: audio mediatype + CC/public domain license
  const fullQuery = `(${baseQuery}) AND mediatype:audio AND (licenseurl:*creativecommons* OR licenseurl:*publicdomain*)`;

  const params = new URLSearchParams();
  params.set('q', fullQuery);
  params.set('output', 'json');
  params.set('rows', String(perPage));
  params.set('start', String((page - 1) * perPage));
  params.append('fl[]', 'identifier');
  params.append('fl[]', 'title');
  params.append('fl[]', 'creator');
  params.append('fl[]', 'subject');
  params.append('fl[]', 'downloads');
  params.append('fl[]', 'avg_rating');
  params.append('sort[]', 'downloads desc');

  try {
    // ── Step 1: Search Archive.org ────────────────────────────
    const searchRes = await fetch(`${ARCHIVE_SEARCH}?${params.toString()}`, {
      next: { revalidate: 300 },
    });
    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Archive.org search failed', status: searchRes.status }, { status: 502 });
    }
    const searchData = await searchRes.json();
    const docs: ArchiveDoc[] = searchData.response?.docs ?? [];
    const total: number      = searchData.response?.numFound ?? 0;

    // ── Step 2: Fetch metadata for each item in parallel ──────
    // This gives us the actual audio file URLs
    const metaFetches = docs.map(async (doc): Promise<SFXItem | null> => {
      try {
        const metaRes = await fetch(`${ARCHIVE_META}/${doc.identifier}`, {
          next: { revalidate: 3600 }, // cache metadata 1 hour
        });
        if (!metaRes.ok) return null;
        const meta: ArchiveMeta = await metaRes.json();

        const files = meta.files ?? [];

        // Find best audio file — prefer short original MP3s
        const audioFile =
          files.find(f => f.name.endsWith('.mp3') && f.source === 'original') ??
          files.find(f => f.format === '128Kbps MP3' || f.format === 'VBR MP3') ??
          files.find(f => f.name.endsWith('.mp3')) ??
          files.find(f => f.name.endsWith('.ogg')) ??
          files.find(f => f.name.endsWith('.wav'));

        if (!audioFile) return null;

        // Build download URL using server + dir from metadata
        const server  = meta.server  ?? 'archive.org';
        const dir     = meta.dir     ?? `/download/${doc.identifier}`;
        const audioUrl = `https://${server}${dir}/${encodeURIComponent(audioFile.name)}`;

        const rawDuration = parseFloat(audioFile.length ?? '0');
        const duration    = isNaN(rawDuration) ? 0 : Math.round(rawDuration * 10) / 10;

        const subjectRaw = Array.isArray(doc.subject)
          ? doc.subject.join(', ')
          : (doc.subject ?? '');

        return {
          id:          doc.identifier,
          name:        doc.title || doc.identifier,
          duration,
          tags:        subjectRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean).slice(0, 6),
          category:    _guessCategory(subjectRaw, baseQuery, category),
          previewUrl:  audioUrl,
          waveformUrl: '', // Archive.org does not provide waveform images
          license:     _detectLicense(meta.metadata?.licenseurl),
          author:      doc.creator || 'Archive.org',
          downloads:   doc.downloads ?? 0,
          source:      'archive',
          archiveUrl:  `https://archive.org/details/${doc.identifier}`,
        };
      } catch {
        return null;
      }
    });

    const results = (await Promise.all(metaFetches)).filter((r): r is SFXItem => r !== null);

    return NextResponse.json({
      results,
      total,
      page,
      pageSize: perPage,
      nextPage: page * perPage < total ? page + 1 : null,
    });
  } catch (err) {
    console.error('[/api/sfx] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────

function _guessCategory(subject: string, query: string, uiCategory: string): string {
  const t = (subject + ' ' + query).toLowerCase();
  if (t.match(/whoosh|swoosh/))              return 'Whooshes';
  if (t.match(/impact|explosion|boom|punch/)) return 'Impacts';
  if (t.match(/transition|swipe/))           return 'Transitions';
  if (t.match(/riser|tension|suspense/))     return 'Risers';
  if (t.match(/click|ui|notification|button/))return 'UI Sounds';
  if (t.match(/footstep|walking/))           return 'Footsteps';
  if (t.match(/rain|wind|birds|nature/))     return 'Ambience';
  if (t.match(/scifi|futuristic|laser/))     return 'Sci-Fi';
  if (t.match(/foley|cloth/))               return 'Foley';
  if (t.match(/cinematic|dramatic/))         return 'Cinematic';
  if (uiCategory) return uiCategory.charAt(0).toUpperCase() + uiCategory.slice(1);
  return 'SFX';
}

function _detectLicense(url?: string): string {
  if (!url) return 'CC';
  if (url.includes('publicdomain') || url.includes('zero') || url.includes('cc0')) return 'CC0';
  if (url.includes('by')) return 'CC-BY';
  return 'CC';
}

// ── Types ─────────────────────────────────────────────────────
interface ArchiveDoc {
  identifier: string;
  title:      string;
  creator?:   string;
  subject?:   string | string[];
  downloads?: number;
  avg_rating?:string;
}

interface ArchiveMeta {
  server?:   string;
  dir?:      string;
  metadata?: { licenseurl?: string };
  files?:    Array<{
    name:    string;
    format?: string;
    source?: string;
    length?: string;
    size?:   string;
  }>;
}

interface SFXItem {
  id:          string;
  name:        string;
  duration:    number;
  tags:        string[];
  category:    string;
  previewUrl:  string;
  waveformUrl: string;
  license:     string;
  author:      string;
  downloads:   number;
  source:      string;
  archiveUrl:  string;
}
