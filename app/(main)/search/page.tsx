"use client";

import { useSearch } from "@/hooks/use-search";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/lib/types";

const MAX_RESULTS = 8;

function SearchResultCard({ result }: { result: SearchResult }) {
  const typeRoute = result.mediaType === "MOVIE" ? "movie" : result.mediaType === "SERIES" ? "series" : "book";
  
  return (
    <Link
      href={`/details/${typeRoute}/${result.id}`}
      className={cn(
        "flex gap-4 p-3 rounded-lg",
        "bg-[#121215] border border-[#27272a]",
        "hover:border-[#a78bfa]/50 hover:bg-[#18181b]",
        "transition-all duration-200"
      )}
    >
      {/* Poster/Image */}
      <div className="w-16 h-24 flex-shrink-0 rounded overflow-hidden bg-[#27272a]">
        {result.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.imageUrl}
            alt={result.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#52525b]">
            <span className="material-symbols-outlined text-2xl">movie</span>
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                result.mediaType === "MOVIE" && "bg-purple-500/20 text-purple-400",
                result.mediaType === "SERIES" && "bg-pink-500/20 text-pink-400",
                result.mediaType === "BOOK" && "bg-orange-500/20 text-orange-400"
              )}
            >
              {result.mediaType === "MOVIE" && "Película"}
              {result.mediaType === "SERIES" && "Serie"}
              {result.mediaType === "BOOK" && "Libro"}
            </span>
            {result.year && <span className="text-xs text-[#71717a]">{result.year}</span>}
          </div>
          <h3 className="text-[#fafafa] font-medium text-sm truncate">{result.title}</h3>
          {result.overview && (
            <p className="text-xs text-[#71717a] line-clamp-2 mt-1">{result.overview}</p>
          )}
        </div>
        
        {result.rating && (
          <div className="flex items-center gap-1 text-yellow-400 text-sm">
            <span>★</span>
            <span>{result.rating.toFixed(1)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function SearchSection({ 
  title, 
  icon, 
  results, 
  color 
}: { 
  title: string; 
  icon: string; 
  results: SearchResult[];
  color: string;
}) {
  if (results.length === 0) return null;
  
  const displayResults = results.slice(0, MAX_RESULTS);
  
  return (
    <section>
      <div className={cn("flex items-center gap-2 mb-4", color)}>
        <span className="material-symbols-outlined">{icon}</span>
        <h2 className="text-lg font-semibold">{title}</h2>
        <span className="text-sm text-[#71717a]">({results.length})</span>
      </div>
      <div className="grid gap-3">
        {displayResults.map((result) => (
          <SearchResultCard key={`${result.mediaType}-${result.id}`} result={result} />
        ))}
      </div>
      {results.length > MAX_RESULTS && (
        <p className="text-center text-sm text-[#71717a] mt-3">
          y {results.length - MAX_RESULTS} más...
        </p>
      )}
    </section>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const { results, isLoading, error, search, clearSearch } = useSearch({ debounceMs: 300 });
  
  // Search on mount with query param
  useEffect(() => {
    if (query) {
      search(query);
    }
    return () => clearSearch();
  }, [query, search, clearSearch]);
  
  const totalResults = results.movies.length + results.series.length + results.books.length;
  
  return (
    <div className="min-h-screen bg-[#09090b] p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#fafafa] mb-2">
          Búsqueda
        </h1>
        <p className="text-[#71717a]">
          {query ? `Resultados para "${query}"` : "Buscar películas, series y libros"}
        </p>
      </div>
      
      {/* Results */}
      <div className="max-w-4xl mx-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#a78bfa] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {error && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-3">error</span>
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        {!isLoading && !error && query && totalResults === 0 && (
          <div className="text-center py-12 rounded-xl bg-[#121215] border border-[#27272a]">
            <span className="material-symbols-outlined text-5xl text-[#52525b] mb-4">search_off</span>
            <p className="text-[#fafafa] text-lg font-medium">No se encontraron resultados</p>
            <p className="text-[#71717a] mt-1">Intenta con otras palabras clave</p>
          </div>
        )}
        
        {!isLoading && !error && totalResults > 0 && (
          <div className="space-y-8">
            <SearchSection 
              title="Películas" 
              icon="movie" 
              results={results.movies} 
              color="text-purple-400"
            />
            <SearchSection 
              title="Series" 
              icon="tv" 
              results={results.series} 
              color="text-pink-400"
            />
            <SearchSection 
              title="Libros" 
              icon="menu_book" 
              results={results.books} 
              color="text-orange-400"
            />
          </div>
        )}
        
        {!query && (
          <div className="text-center py-12 rounded-xl bg-[#121215] border border-[#27272a]">
            <span className="material-symbols-outlined text-5xl text-[#52525b] mb-4">search</span>
            <p className="text-[#fafafa] text-lg font-medium">Ingresa un término de búsqueda</p>
            <p className="text-[#71717a] mt-1">Busca películas, series o libros</p>
          </div>
        )}
      </div>
    </div>
  );
}