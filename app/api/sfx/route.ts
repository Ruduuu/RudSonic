import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

// ── API League — Search Sound Effects ─────────────────────────
// Endpoint: https://api.apileague.com/search-sound-effects
// Backed by Pixabay's sound library (~50,000 CC0 sounds)
// Docs: https://apileague.com/apis/find/sound-effects/

const API_LEAGUE_URL = 'https://api.apileague.com/search-sound-effects';

// SFX DURATION HARD LIMIT: 30 seconds max
const SFX_MAX_DURATION = 30;

// Map our UI category buttons → search keywords
const CATEGORY_QUERIES: Record<string, string> = {
  whooshes:         'whoosh swoosh',
  transitions:      'transition swipe sweep',
  impacts:          'impact explosion boom punch hit',
  risers:           'riser buildup tension suspense',
  'cinematic-hits': 'cinematic stinger dramatic hit',
  'ui-sounds':      'ui click notification button beep interface',
  footsteps:        'footsteps walking steps',
  ambience:         'ambient atmosphere background',
  nature:           'rain wind forest birds',
  traffic:          'traffic car city street',
  city:             'city crowd outdoor urban',
  typing:           'typing keyboard click',
  clock:            'clock ticking tick tock',
  'sci-fi':         'futuristic laser science fiction',
  foley:            'foley movement cloth texture',
  doors:            'door open close creak',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q        = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1', 10);
  const perPage  = 30;

  // Build query string
  let query = q.trim();
  if (!query && category) {
    query = CATEGORY_QUERIES[category.toLowerCase()] ?? category;
  }
  if (!query) query = 'sound effect';

  const offset = (page - 1) * perPage;

  const params = new URLSearchParams({
    query,
    number: String(perPage),
    offset: String(offset),
  });

  try {
    const res = await fetch(`${API_LEAGUE_URL}?${params.toString()}`, {
      headers: {
        'x-api-key': process.env.API_LEAGUE_KEY ?? '',
      },
      next: { revalidate: 300 }, // 5-min edge cache
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'API League error', status: res.status },
        { status: 502 }
      );
    }

    const data = await res.json();

    // API League returns: { sounds: [...], available: N }
    const rawSounds: ApiLeagueSound[] = data.sounds ?? [];
    const total: number               = data.available ?? rawSounds.length;

    // ── HARD FILTER: only sounds ≤ 30 seconds ────────────────
    const results = rawSounds
      .filter(s => {
        const dur = typeof s.duration === 'number' ? s.duration : parseFloat(String(s.duration ?? '999'));
        return !isNaN(dur) && dur > 0 && dur <= SFX_MAX_DURATION;
      })
      .map(s => _normalize(s, category));

    return NextResponse.json({
      results,
      total,
      page,
      pageSize:   perPage,
      nextPage:   offset + perPage < total ? page + 1 : null,
    });
  } catch (err) {
    console.error('[/api/sfx] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Normalise API League sound → RudSonic SFX format ─────────
function _normalize(s: ApiLeagueSound, uiCategory: string) {
  const dur = typeof s.duration === 'number' ? s.duration : parseFloat(String(s.duration ?? '0'));
  const tags = (s.tags ?? '').split(',').map((t: string) => t.trim()).filter(Boolean);

  return {
    id:          String(s.id ?? s.url ?? Math.random()),
    name:        s.title || tags[0] || 'Sound',
    duration:    Math.round((isNaN(dur) ? 0 : dur) * 10) / 10,
    tags:        tags.slice(0, 6),
    category:    _guessCategory(s.tags ?? '', uiCategory),
    previewUrl:  s.url,       // Direct CDN MP3 link from Pixabay
    waveformUrl: '',          // Not provided by API League
    license:     'CC0',       // All API League sounds are CC0
    author:      s.user ?? 'Pixabay',
    downloads:   s.downloads  ?? 0,
    source:      'apileague',
    pixabayUrl:  s.pixabay_url ?? '',
  };
}

function _guessCategory(tags: string, uiCategory: string): string {
  const t = tags.toLowerCase();
  if (t.match(/whoosh|swoosh/))              return 'Whooshes';
  if (t.match(/impact|explosion|boom|punch/)) return 'Impacts';
  if (t.match(/transition|swipe/))           return 'Transitions';
  if (t.match(/riser|buildup|tension/))      return 'Risers';
  if (t.match(/click|ui|notification|button/))return 'UI Sounds';
  if (t.match(/footstep|walking|steps/))     return 'Footsteps';
  if (t.match(/rain|wind|forest|birds/))     return 'Nature';
  if (t.match(/traffic|car|city|street/))    return 'Traffic/City';
  if (t.match(/typing|keyboard/))            return 'Typing';
  if (t.match(/clock|tick/))                 return 'Clock';
  if (t.match(/ambient|atmosphere/))         return 'Ambience';
  if (t.match(/futuristic|laser|scifi/))     return 'Sci-Fi';
  if (t.match(/door|creak/))                 return 'Doors';
  if (t.match(/cinematic|dramatic/))         return 'Cinematic';
  if (uiCategory) return uiCategory.charAt(0).toUpperCase() + uiCategory.slice(1).replace(/-/g, ' ');
  return 'SFX';
}

// ── API League response type ──────────────────────────────────
interface ApiLeagueSound {
  id?:          number | string;
  title?:       string;
  tags?:        string;
  duration?:    number | string;
  url?:         string;         // Direct CDN MP3 URL
  user?:        string;
  downloads?:   number;
  pixabay_url?: string;
}