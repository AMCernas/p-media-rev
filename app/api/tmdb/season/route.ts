import { NextRequest, NextResponse } from 'next/server';
import { getSeasonDetails } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const seriesId = searchParams.get('seriesId');
  const seasonNumber = searchParams.get('seasonNumber');

  if (!seriesId || !seasonNumber) {
    return NextResponse.json(
      { error: 'Missing seriesId or seasonNumber' },
      { status: 400 }
    );
  }

  try {
    const seasonData = await getSeasonDetails(seriesId, parseInt(seasonNumber, 10));
    
    return NextResponse.json({
      season: {
        id: seasonData.id,
        name: seasonData.name,
        season_number: seasonData.season_number,
        poster_path: seasonData.poster_path,
      },
      episodes: seasonData.episodes.map(ep => ({
        id: ep.id,
        name: ep.name,
        overview: ep.overview,
        episode_number: ep.episode_number,
        season_number: ep.season_number,
        still_path: ep.still_path,
        air_date: ep.air_date,
        runtime: ep.runtime,
        vote_average: ep.vote_average,
      })),
    });
  } catch (error) {
    console.error('Error fetching season details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch season details' },
      { status: 500 }
    );
  }
}