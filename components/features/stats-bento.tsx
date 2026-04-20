/**
 * StatsBento - Display user statistics in bento grid layout
 * 
 * Shows: Watchlist count, Reviews count, Published count
 */

import { cn } from '@/lib/utils';

interface StatsBentoProps {
  watchlistCount: number;
  reviewsCount: number;
  publishedCount: number;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  description?: string;
}

function StatCard({ label, value, icon, description }: StatCardProps) {
  return (
    <div className="relative p-4 rounded-xl border border-border bg-card overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      
      <div className="relative">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon && <span className="w-4 h-4">{icon}</span>}
          <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        
        <div className="text-2xl font-bold text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

export function StatsBento({ watchlistCount, reviewsCount, publishedCount, className }: StatsBentoProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-3', className)}>
      <StatCard 
        label="Watchlist" 
        value={watchlistCount}
        description=" guardados"
      />
      <StatCard 
        label="Reseñas" 
        value={reviewsCount}
        description=" total"
      />
      <StatCard 
        label="Publicadas" 
        value={publishedCount}
        description=" visibles"
      />
    </div>
  );
}