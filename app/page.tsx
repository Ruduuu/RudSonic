
'use client';

import { useEffect, useState, type FormEvent } from 'react';

type AudioItem = {
  id: string;
  title?: string;
  name?: string;
  artist?: string;
  author?: string;
  duration?: number;
  previewUrl?: string;
  imageUrl?: string;
  genre?: string;
  category?: string;
  license?: string;
  licenseUrl?: string;
  jamendoUrl?: string;
  archiveUrl?: string;
};

type Tab = 'music' | 'sfx';

const genres = [
  ['All genres', ''],
  ['Cinematic', 'cinematic'],
  ['Ambient', 'ambient'],
  ['Lo-fi', 'lofi'],
  ['Electronic', 'electronic'],
  ['Hip-hop', 'hiphop'],
  ['Corporate', 'corporate'],
  ['Pop', 'pop'],
  ['Jazz', 'jazz'],
  ['Motivational', 'motivational'],
  ['Wedding', 'wedding'],
];

const categories = [
  ['All effects', ''],
  ['Whooshes', 'whooshes'],
  ['Transitions', 'transitions'],
  ['Impacts', 'impacts'],
  ['Risers', 'risers'],
  ['Cinematic hits', 'cinematic-hits'],
  ['UI sounds', 'ui-sounds'],
  ['Footsteps', 'footsteps'],
  ['Ambience', 'ambience'],
  ['Nature', 'nature'],
  ['Sci-fi', 'sci-fi'],
  ['Foley', 'foley'],
  ['Doors', 'doors'],
  ['Vehicles', 'vehicles'],
];

function formatDuration(seconds = 0) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('music');
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AudioItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rudsonic-favorites');
      if (saved) setFavorites(JSON.parse(saved));
    } catch {
      // Favorites can still be used for this session.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'rudsonic-favorites',
        JSON.stringify(favorites)
      );
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }, [favorites]);

  useEffect(() => {
    let cancelled = false;

    async function loadAudio() {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: String(page),
      });

      if (query.trim()) params.set('q', query.trim());

      if (filter) {
        params.set(tab === 'music' ? 'genre' : 'category', filter);
      }

      try {
        const response = await fetch(
          `/api/${tab}?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || `Request failed (${response.status})`
          );
        }

        if (cancelled) return;

        setItems(Array.isArray(data.results) ? data.results : []);
        setTotal(Number(data.total) || 0);
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load audio. Please try again.'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAudio();

    return () => {
      cancelled = true;
    };
  }, [tab, query, filter, page]);

  function changeTab(nextTab: Tab) {
    setTab(nextTab);
    setFilter('');
    setQuery('');
    setDraft('');
    setPage(1);
    setFavoritesOnly(false);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(draft.trim());
  }

  function toggleFavorite(id: string) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  const visibleItems = favoritesOnly
    ? items.filter((item) =>
        favorites.includes(`${tab}:${item.id}`)
      )
    : items;

  const pageSize = tab === 'music' ? 30 : 20;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="/" aria-label="RudSonic home">
          <span className="brandIcon">R</span>
          <span>rudsonic<span className="brandDot">.</span></span>
        </a>
        <div className="topNote">
          <span className="liveDot" />
          AUDIO LIBRARY FOR CREATORS
        </div>
        <a
          className="topLink"
          href="https://archive.org/"
          target="_blank"
          rel="noreferrer"
        >
          Explore sources ↗
        </a>
      </header>

      <section className="hero">
        <div className="eyebrow">YOUR EDITING SOUNDTRACK STARTS HERE</div>
        <h1>
          Find your <span>sound.</span>
        </h1>
        <p className="heroText">
          Music and sound effects for your next great edit.
          Search, preview, save, and discover audio for your projects.
        </p>

        <div className="tabs">
          <button
            className={tab === 'music' ? 'tab active' : 'tab'}
            onClick={() => changeTab('music')}
          >
            <span>♫</span> Music
          </button>
          <button
            className={tab === 'sfx' ? 'tab active' : 'tab'}
            onClick={() => changeTab('sfx')}
          >
            <span>◉</span> Sound effects
          </button>
        </div>

        <form className="search" onSubmit={search}>
          <span className="searchIcon">⌕</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              tab === 'music'
                ? 'Search tracks, artists, or moods...'
                : 'Search whooshes, impacts, ambience...'
            }
            aria-label="Search audio"
          />
          {draft && (
            <button
              type="button"
              className="clearSearch"
              onClick={() => {
                setDraft('');
                setQuery('');
                setPage(1);
              }}
            >
              ×
            </button>
          )}
          <button className="searchButton" type="submit">
            Search
          </button>
        </form>
      </section>

      <section className="library">
        <div className="libraryHeading">
          <div>
            <div className="eyebrow">
              {tab === 'music' ? 'THE MUSIC LIBRARY' : 'THE SFX LIBRARY'}
            </div>
            <h2>
              {query
                ? `Results for “${query}”`
                : tab === 'music'
                  ? 'Explore music'
                  : 'Explore sound effects'}
            </h2>
            <p className="muted">
              {loading
                ? 'Finding audio for you…'
                : `${total.toLocaleString()} source results · Page ${page}`}
            </p>
          </div>

          <button
            className={favoritesOnly ? 'favoriteFilter selected' : 'favoriteFilter'}
            onClick={() => setFavoritesOnly(!favoritesOnly)}
          >
            ♥ {favoritesOnly ? 'Show all audio' : 'My favorites'}
          </button>
        </div>

        <div className="filters">
          {(tab === 'music' ? genres : categories).map(([label, value]) => (
            <button
              key={value || 'all'}
              className={filter === value ? 'chip chosen' : 'chip'}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="message error">
            <strong>Could not load audio</strong>
            <p>{error}</p>
            <button
              className="retryButton"
              onClick={() => {
                setQuery((current) => current + ' ');
                setQuery((current) => current.trim());
              }}
            >
              Try again
            </button>
          </div>
        )}

        {loading && (
          <div className="loadingGrid">
            {Array.from({ length: 8 }, (_, index) => (
              <div className="skeleton" key={index}>
                <div className="skeletonCover" />
                <div className="skeletonLine" />
                <div className="skeletonLine short" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && visibleItems.length === 0 && (
          <div className="empty">
            <div className="emptyIcon">♫</div>
            <h3>
              {favoritesOnly ? 'No favorites on this page' : 'No audio found'}
            </h3>
            <p>
              {favoritesOnly
                ? 'Browse the library and tap the heart to save audio.'
                : 'Try another search or select a different category.'}
            </p>
            {favoritesOnly && (
              <button
                className="searchButton"
                onClick={() => setFavoritesOnly(false)}
              >
                Browse library
              </button>
            )}
          </div>
        )}

        {!loading && !error && visibleItems.length > 0 && (
          <div className="audioGrid">
            {visibleItems.map((item) => {
              const favoriteKey = `${tab}:${item.id}`;
              const isFavorite = favorites.includes(favoriteKey);
              const title = item.title || item.name || 'Untitled audio';
              const creator = item.artist || item.author || 'Unknown creator';

              return (
                <article className="audioCard" key={item.id}>
                  <div className="cover">
                    {item.imageUrl ? (
                      // Remote artwork supplied by the audio provider.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <div className="coverFallback">
                        <span>♫</span>
                        <small>RUDSONIC</small>
                      </div>
                    )}
                    <button
                      className={isFavorite ? 'heart saved' : 'heart'}
                      onClick={() => toggleFavorite(favoriteKey)}
                      aria-label={
                        isFavorite ? 'Remove from favorites' : 'Add to favorites'
                      }
                      title={isFavorite ? 'Remove favorite' : 'Add favorite'}
                    >
                      {isFavorite ? '♥' : '♡'}
                    </button>
                    <span className="duration">
                      {formatDuration(item.duration)}
                    </span>
                  </div>

                  <div className="cardInfo">
                    <div className="cardCategory">
                      {item.genre || item.category || (tab === 'music' ? 'Music' : 'Sound effect')}
                    </div>
                    <h3 title={title}>{title}</h3>
                    <p className="creator" title={creator}>{creator}</p>

                    {item.previewUrl ? (
                      <audio
                        controls
                        preload="none"
                        src={item.previewUrl}
                        aria-label={`Preview ${title}`}
                      >
                        Your browser does not support audio playback.
                      </audio>
                    ) : (
                      <p className="muted">Preview unavailable</p>
                    )}

                    <div className="cardFooter">
                      <span className="licenseTag">
                        {item.license || 'Check license'}
                      </span>
                      {(item.jamendoUrl || item.archiveUrl) && (
                        <a
                          className="sourceLink"
                          href={item.jamendoUrl || item.archiveUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Source ↗
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && !favoritesOnly && total > pageSize && (
          <div className="pagination">
            <button
              disabled={page <= 1}
              onClick={() => {
                setPage((current) => Math.max(1, current - 1));
                window.scrollTo({ top: 500, behavior: 'smooth' });
              }}
            >
              ← Previous
            </button>
            <span>Page {page} of {pageCount}</span>
            <button
              disabled={page >= pageCount}
              onClick={() => {
                setPage((current) => current + 1);
                window.scrollTo({ top: 500, behavior: 'smooth' });
              }}
            >
              Next →
            </button>
          </div>
        )}
      </section>

      <section className="editorBanner">
        <div className="editorSymbol">▶</div>
        <div>
          <h3>Made for your editing workflow.</h3>
          <p>Preview audio here, then open the original source to download when permitted.</p>
        </div>
        <span className="editorLabel">PREMIERE PRO WORKFLOW</span>
      </section>

      <footer className="footer">
        <a className="brand footerBrand" href="/">
          <span className="brandIcon">R</span>
          <span>rudsonic<span className="brandDot">.</span></span>
        </a>
        <p>Discover audio. Create something memorable.</p>
        <span>Audio is provided by third-party sources. Check each track’s license before use.</span>
      </footer>

      <style jsx global>{`
        :root {
          color-scheme: dark;
          --bg: #0b0c10;
          --panel: #12141b;
          --border: #252832;
          --text: #f5f6fa;
          --muted: #9297a6;
          --accent: #a5f36b;
        }
        * { box-sizing: border-box; }
        html { background: var(--bg); }
        body {
          margin: 0;
          background: var(--bg);
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
        }
        button, input { font: inherit; }
        button { cursor: pointer; }
        button:disabled { opacity: .35; cursor: not-allowed; }
        a { color: inherit; text-decoration: none; }
        .app { min-height: 100vh; }
        .topbar {
          height: 76px; padding: 0 6%; display: flex; align-items: center;
          justify-content: space-between; gap: 20px; border-bottom: 1px solid #20222b;
        }
        .brand { display: inline-flex; align-items: center; gap: 10px; font-size: 21px; font-weight: 850; letter-spacing: -1px; }
        .brandIcon {
          width: 33px; height: 33px; display: grid; place-items: center;
          border-radius: 10px; background: var(--accent); color: #10150b; font-size: 19px;
        }
        .brandDot { color: var(--accent); }
        .topNote, .eyebrow {
          color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: 1.8px;
        }
        .topNote { display: flex; align-items: center; gap: 9px; }
        .liveDot { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; }
        .topLink { color: #c3c6d0; font-size: 12px; }
        .topLink:hover, .sourceLink:hover { color: var(--accent); }
        .hero { padding: 74px 20px 52px; text-align: center; background: radial-gradient(ellipse at 50% 0%, #202b1b 0%, #0b0c10 58%); }
        .hero h1 { margin: 17px 0 12px; font-size: clamp(42px, 7vw, 72px); line-height: 1.05; letter-spacing: -4px; }
        .hero h1 span { color: var(--accent); }
        .heroText { max-width: 530px; margin: 0 auto; color: #a4a8b5; font-size: 14px; line-height: 1.8; }
        .tabs { display: flex; justify-content: center; gap: 8px; margin: 32px 0 22px; }
        .tab { border: 1px solid var(--border); background: #12141a; color: #b5b8c3; padding: 12px 18px; border-radius: 9px; font-size: 13px; font-weight: 700; }
        .tab span { margin-right: 8px; }
        .tab.active { background: var(--accent); color: #14190f; border-color: var(--accent); }
        .search { max-width: 670px; margin: auto; display: flex; align-items: center; gap: 12px; padding: 7px; border: 1px solid #30333d; border-radius: 12px; background: #13151c; }
        .searchIcon { padding-left: 12px; color: #8e94a2; font-size: 25px; }
        .search input { flex: 1; min-width: 0; background: transparent; color: white; outline: none; border: 0; font-size: 13px; }
        .searchButton { background: var(--accent); color: #12170e; border: 0; border-radius: 8px; padding: 12px 18px; font-size: 12px; font-weight: 850; }
        .searchButton:hover { background: #bbff8b; }
        .clearSearch { background: none; border: 0; color: #aaa; font-size: 20px; }
        .library { max-width: 1240px; padding: 26px 28px 60px; margin: auto; }
        .libraryHeading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 25px; }
        .libraryHeading h2 { margin: 9px 0 5px; font-size: 28px; letter-spacing: -.8px; }
        .muted { color: var(--muted); font-size: 12px; margin: 0; }
        .favoriteFilter { background: #15171e; border: 1px solid var(--border); color: #c8cad2; border-radius: 8px; padding: 11px 14px; font-size: 12px; white-space: nowrap; }
        .favoriteFilter.selected { border-color: var(--accent); color: var(--accent); }
        .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 26px; }
        .chip { border: 1px solid #272a34; background: #12141a; color: #aeb2be; border-radius: 7px; padding: 9px 12px; font-size: 11px; }
        .chip:hover { border-color: #6a784f; }
        .chip.chosen { background: #20291b; color: var(--accent); border-color: #4d6937; }
        .audioGrid, .loadingGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 17px; }
        .audioCard, .skeleton { min-width: 0; overflow: hidden; background: var(--panel); border: 1px solid var(--border); border-radius: 12px; }
        .audioCard { transition: transform .18s, border-color .18s; }
        .audioCard:hover { transform: translateY(-3px); border-color: #41483b; }
        .cover { position: relative; height: 150px; background: linear-gradient(135deg, #273326, #171b27 65%, #292238); overflow: hidden; }
        .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .coverFallback { height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; color: var(--accent); }
        .coverFallback span { font-size: 43px; }
        .coverFallback small { margin-top: 6px; font-size: 9px; letter-spacing: 3px; opacity: .7; }
        .heart { position: absolute; right: 10px; top: 10px; width: 31px; height: 31px; border: 1px solid #ffffff35; background: #090a0bbb; color: white; border-radius: 9px; font-size: 18px; }
        .heart.saved { color: #ff7c9a; }
        .duration { position: absolute; bottom: 9px; right: 9px; padding: 4px 7px; border-radius: 5px; background: #08090bcc; color: white; font-size: 10px; }
        .cardInfo { padding: 14px; }
        .cardCategory { text-transform: uppercase; letter-spacing: 1px; color: var(--accent); font-size: 9px; font-weight: 850; margin-bottom: 8px; }
        .cardInfo h3 { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 14px; margin: 0 0 6px; }
        .creator { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--muted); font-size: 11px; margin: 0 0 14px; }
        .cardInfo audio { display: block; width: 100%; height: 34px; margin-bottom: 12px; }
        .cardFooter { display: flex; justify-content: space-between; align-items: center; gap: 8px; border-top: 1px solid #252832; padding-top: 11px; }
        .licenseTag { color: #afb3bf; background: #22252e; border-radius: 4px; padding: 4px 6px; font-size: 9px; }
        .sourceLink { font-size: 10px; color: #c6c9d2; }
        .empty, .message { text-align: center; border: 1px dashed #30333d; border-radius: 12px; padding: 48px 20px; }
        .emptyIcon { color: var(--accent); font-size: 35px; }
        .empty h3 { margin-bottom: 8px; }
        .empty p, .message p { color: var(--muted); font-size: 13px; }
        .error { border-color: #754047; color: #ffb4bd; }
        .retryButton { background: #27202a; border: 1px solid #754047; color: #ffd5da; border-radius: 7px; padding: 9px 13px; }
        .loadingGrid { margin-bottom: 20px; }
        .skeleton { padding: 10px; }
        .skeletonCover, .skeletonLine { background: #22252e; border-radius: 6px; animation: pulse 1.3s ease-in-out infinite alternate; }
        .skeletonCover { height: 130px; margin-bottom: 15px; }
        .skeletonLine { height: 10px; margin: 10px 0; }
        .skeletonLine.short { width: 60%; }
        @keyframes pulse { from { opacity: .45; } to { opacity: .95; } }
        .pagination { display: flex; align-items: center; justify-content: center; gap: 20px; margin-top: 32px; color: #aeb2be; font-size: 12px; }
        .pagination button { background: #15171e; border: 1px solid var(--border); color: white; padding: 10px 14px; border-radius: 7px; }
        .editorBanner { max-width: 1184px; margin: 0 auto 55px; padding: 25px; display: flex; align-items: center; gap: 17px; border: 1px solid #30382b; border-radius: 12px; background: linear-gradient(100deg, #172015, #11131a); }
        .editorSymbol { width: 43px; height: 43px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 10px; color: var(--accent); background: #2b3824; }
        .editorBanner h3 { margin: 0 0 7px; font-size: 15px; }
        .editorBanner p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.6; }
        .editorLabel { margin-left: auto; color: #b3c69f; font-size: 9px; letter-spacing: 1.4px; white-space: nowrap; }
        .footer { border-top: 1px solid #20222b; padding: 28px 6%; display: flex; align-items: center; flex-wrap: wrap; gap: 18px; }
        .footerBrand { font-size: 16px; }
        .footerBrand .brandIcon { width: 27px; height: 27px; font-size: 15px; }
        .footer p { color: #a3a7b4; font-size: 11px; margin-right: auto; }
        .footer > span { width: 100%; color: #777d8c; font-size: 10px; }
        @media (max-width: 1000px) {
          .audioGrid, .loadingGrid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .editorBanner { margin-left: 28px; margin-right: 28px; }
        }
        @media (max-width: 700px) {
          .topbar { height: 65px; padding: 0 18px; }
          .topNote { display: none; }
          .hero { padding-top: 55px; }
          .hero h1 { letter-spacing: -2px; }
          .library { padding: 25px 16px 45px; }
          .libraryHeading { align-items: start; flex-direction: column; }
          .audioGrid, .loadingGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
          .cover { height: 125px; }
          .cardInfo { padding: 10px; }
          .cardInfo h3 { font-size: 12px; }
          .cardInfo audio { height: 32px; }
          .search { gap: 7px; }
          .searchIcon { padding-left: 5px; }
          .searchButton { padding: 11px 12px; }
          .editorBanner { margin: 0 16px 40px; padding: 17px; flex-wrap: wrap; }
          .editorLabel { margin-left: 0; width: 100%; }
          .footer { padding: 25px 18px; }
        }
        @media (max-width: 390px) {
          .audioGrid, .loadingGrid { grid-template-columns: 1fr; }
          .cover { height: 175px; }
          .topLink { font-size: 10px; }
        }
      `}</style>
    </main>
  );
}
