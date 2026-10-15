
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const API_LEAGUE_URL =
  'https://api.apileague.com/search-sound-effects';

const SFX_MAX_DURATION = 30;

const CATEGORY_QUERIES: Record<string, string> = {
  whooshes: 'whoosh swoosh',
  transitions: 'transition swipe sweep',
  impacts: 'impact explosion boom punch hit',
  risers: 'riser buildup tension suspense',
  'cinematic-hits': 'cinematic stinger dramatic hit',
  'ui-sounds': 'ui click notification button beep interface',
  footsteps: 'footsteps walking steps',
  ambience: 'ambient atmosphere background',
  nature: 'rain wind forest birds',
  traffic: 'traffic car city street',
  city: 'city crowd outdoor urban',
  typing: 'typing keyboard click',
  clock: 'clock ticking tick tock',
  'sci-fi': 'futuristic laser science fiction',
  foley: 'foley movement cloth texture',
  doors: 'door open close creak',
};

interface ApiLeagueSound {
  id?: number | string;
  title?: string;
  tags?: string | string[];
  duration?: number | string;
  duration_seconds?: number | string;
  url?: string;
  user?: string;
  author?: string;
  downloads?: number;
  pixabay_url?: string;
  license?: string | { name?: string; link?: string };
}

function getDuration(s: ApiLeagueSound): number {
  const raw = s.duration_seconds ?? s.duration;
  const duration = Number(raw);
  return Number.isFinite(duration) ? duration : 0;
}

function getTags(tags?: string | string[]): string[] {
  if (Array.isArray(tags)) {
    return tags.map(t => String(t).trim()).filter(Boolean);
  }

  return (tags ?? '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

function guessCategory(tags: string, uiCategory: string): string {
  const t = tags.toLowerCase();

  if (/whoosh|swoosh/.test(t)) return 'Whooshes';
  if (/impact|explosion|boom|punch/.test(t)) return 'Impacts';
  if (/transition|swipe/.test(t)) return 'Transitions';
  if (/riser|buildup|tension/.test(t)) return 'Risers';
  if (/click|ui|notification|button/.test(t)) return 'UI Sounds';
  if (/footstep|walking|steps/.test(t)) return 'Footsteps';
  if (/rain|wind|forest|birds/.test(t)) return 'Nature';
  if (/traffic|car|city|street/.test(t)) return 'Traffic/City';
  if (/typing|keyboard/.test(t)) return 'Typing';
  if (/clock|tick/.test(t)) return 'Clock';
  if (/ambient|atmosphere/.test(t)) return 'Ambience';
  if (/futuristic|laser|scifi/.test(t)) return 'Sci-Fi';
  if (/door|creak/.test(t)) return 'Doors';
  if (/cinematic|dramatic/.test(t)) return 'Cinematic';

  return uiCategory
    ? uiCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'SFX';
}

function normalize(s: ApiLeagueSound, uiCategory: string) {
  const tags = getTags(s.tags);
  const duration = getDuration(s);
  const license = s.license;

  const licenseName =
    typeof license === 'string'
      ? license
      : license?.name ?? 'Check source license';

  return {
    id: String(s.id ?? s.url ?? `${s.title}-${duration}`),
    name: s.title || tags[0] || 'Sound',
    duration: Math.round(duration * 10) / 10,
    tags: tags.slice(0, 6),
    category: guessCategory(tags.join(' '), uiCategory),
    previewUrl: s.url ?? '',
    waveformUrl: '',
    license: licenseName,
    author: s.author ?? s.user ?? 'Unknown',
    downloads: s.downloads ?? 0,
    source: 'apileague',
    pixabayUrl: s.pixabay_url ?? '',
    licenseUrl:
      typeof license === 'object' ? license.link ?? '' : '',
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const requestedPage = Number.parseInt(
    searchParams.get('page') ?? '1',
    10
  );

  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 10000)
      : 1;

  const perPage = 30;

  const apiKey = process.env.API_LEAGUE_KEY;

  if (!apiKey) {
    console.error('[/api/sfx] API_LEAGUE_KEY is missing');
    return NextResponse.json(
      { error: 'Sound search is not configured' },
      { status: 500 }
    );
  }

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
    const res = await fetch(
      `${API_LEAGUE_URL}?${params.toString()}`,
      {
        headers: { 'x-api-key': apiKey },
        cache: 'no-store',
      }
    );

    // Log the real upstream failure without exposing the API key.
    if (!res.ok) {
      const body = (await res.text()).slice(0, 1000);

      console.error('[/api/sfx] API League failed', {
        status: res.status,
        message: body,
        quotaUsed: res.headers.get('X-API-Quota-Used'),
        quotaLeft: res.headers.get('X-API-Quota-Left'),
      });

      return NextResponse.json(
        {
          error: 'Sound provider request failed',
          status: res.status,
          message:
            res.status === 402
              ? 'The provider rejected the request. Check API quota, credits, or billing.'
              : 'Check the server logs for provider diagnostics.',
        },
        { status: 502 }
      );
    }

    const data = await res.json();

    const rawSounds: ApiLeagueSound[] =
      Array.isArray(data.sounds) ? data.sounds : [];

    const results = rawSounds
      .filter(s => {
        const duration = getDuration(s);

        return (
          duration > 0 &&
          duration <= SFX_MAX_DURATION &&
          Boolean(s.url)
        );
      })
      .map(s => normalize(s, category));

    return NextResponse.json(
      {
        results,
        total: Number(data.available ?? rawSounds.length),
        page,
        pageSize: perPage,
        nextPage:
          offset + perPage <
          Number(data.available ?? rawSounds.length)
            ? page + 1
            : null,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (err) {
    console.error('[/api/sfx] Request failed:', err);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
