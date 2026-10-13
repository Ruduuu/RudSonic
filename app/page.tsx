import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'RudSonic API',
    version: '1.0.0',
    endpoints: {
      music: '/api/music?q=&genre=&mood=&bpm=&page=',
      sfx: '/api/sfx?q=&category=&page=',
      trending: '/api/trending',
    },
  });
}
