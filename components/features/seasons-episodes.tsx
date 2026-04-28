"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Season {
  id: number;
  name: string;
  season_number: number;
  overview: string | null;
  air_date: string | null;
  poster_path: string | null;
  episode_count: number;
}

interface Episode {
  id: number;
  name: string;
  overview: string | null;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
}

interface SeasonsEpisodesProps {
  seasons: Season[];
  seriesId: string;
  seriesTitle: string;
}

/** Format date for display */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Fecha desconocida";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function SeasonsEpisodes({ seasons, seriesId, seriesTitle }: SeasonsEpisodesProps) {
  const [selectedSeason, setSelectedSeason] = useState<number>(
    seasons.length > 0 ? seasons[0].season_number : 0
  );
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch episodes function
  const fetchEpisodes = async (seasonNumber: number) => {
    setLoadingEpisodes(true);
    setError(null);

    try {
      const response = await fetch(`/api/tmdb/season?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
      if (!response.ok) throw new Error("Failed to fetch episodes");
      const data = await response.json();
      setEpisodes(data.episodes || []);
    } catch (err) {
      console.error("Error fetching episodes:", err);
      setError("Error al cargar episodios");
    } finally {
      setLoadingEpisodes(false);
    }
  };

  // Fetch episodes for first season on mount
  useEffect(() => {
    if (selectedSeason > 0) {
      fetchEpisodes(selectedSeason);
    }
  }, [seriesId]);

  const handleSeasonSelect = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
    fetchEpisodes(seasonNumber);
  };

  // No seasons available
  if (seasons.length === 0) return null;

  return (
    <div className="mt-12 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold text-[#fafafa] mb-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-[#a78bfa]">tv</span>
        Temporadas y Episodios
      </h2>

      {/* Season Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {seasons.map((season) => (
          <button
            key={season.season_number}
            onClick={() => handleSeasonSelect(season.season_number)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              selectedSeason === season.season_number
                ? "bg-[#a78bfa] text-[#09090b]"
                : "bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46] hover:text-[#fafafa]"
            )}
          >
            {season.name.replace(/^Season /i, "Temporada ")}
          </button>
        ))}
      </div>

      {/* Episodes List */}
      {loadingEpisodes && (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-[#a78bfa] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-red-400 text-center py-4">{error}</div>
      )}

      {!loadingEpisodes && !error && episodes.length > 0 && (
        <div className="space-y-3">
          {episodes.map((episode) => (
            <div
              key={episode.id}
              className="flex gap-4 p-3 rounded-lg bg-[#121215] border border-[#27272a] hover:border-[#a78bfa]/30 transition-colors"
            >
              {/* Episode Image/Number */}
              <div className="flex-shrink-0 w-32 h-20 rounded overflow-hidden bg-[#27272a]">
                {episode.still_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                    alt={episode.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#a1a1aa]">
                    <span className="text-2xl font-bold">E{episode.episode_number}</span>
                  </div>
                )}
              </div>

              {/* Episode Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#a78bfa] font-semibold text-sm">
                    Episodio {episode.episode_number}
                  </span>
                  {episode.air_date && (
                    <span className="text-xs text-[#a1a1aa]">
                      {formatDate(episode.air_date)}
                    </span>
                  )}
                  {episode.runtime && (
                    <span className="text-xs text-[#a1a1aa]">
                      • {episode.runtime} min
                    </span>
                  )}
                </div>
                <h3 className="text-[#fafafa] font-medium text-sm mb-1 truncate">
                  {episode.name}
                </h3>
                {episode.overview && (
                  <p className="text-xs text-[#a1a1aa] line-clamp-2">
                    {episode.overview}
                  </p>
                )}
              </div>

              {/* Rating */}
              {episode.vote_average > 0 && (
                <div className="flex-shrink-0 flex items-center gap-1 text-yellow-400 text-sm">
                  <span>★</span>
                  <span>{episode.vote_average.toFixed(1)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loadingEpisodes && !error && episodes.length === 0 && selectedSeason && (
        <div className="text-center py-8 text-[#a1a1aa]">
          No hay episodios disponibles para esta temporada
        </div>
      )}
    </div>
  );
}