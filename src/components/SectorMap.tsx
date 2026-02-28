import { useMemo } from 'react';
import { motion } from 'motion/react';
import type { SectorMap as SectorMapType, SectorStatus } from '../types';

interface SectorMapProps {
  sectorMap: SectorMapType | undefined;
  compact?: boolean;
}

const STATUS_COLORS: Record<SectorStatus, string> = {
  pending: 'var(--color-surface-hover)',
  writing: 'var(--color-primary)',
  verifying: '#f59e0b', // amber
  validated: '#22c55e', // green
  writeError: '#ef4444', // red
  readError: '#8b5cf6', // purple
  corrupt: '#f97316', // orange
  noStorage: '#1f2937', // dark gray
};

const STATUS_LABELS: Record<SectorStatus, string> = {
  pending: 'Pending',
  writing: 'Writing',
  verifying: 'Verifying',
  validated: 'Validated',
  writeError: 'Write Error',
  readError: 'Read Error',
  corrupt: 'Corrupt',
  noStorage: 'No Storage',
};

export function SectorMap({ sectorMap, compact = false }: SectorMapProps) {
  // Calculate grid dimensions based on total sectors
  const gridConfig = useMemo(() => {
    if (!sectorMap) return { cols: 32, rows: 16, displaySectors: [] as SectorStatus[] };
    
    const total = sectorMap.totalSectors;
    // Create a visual grid - aim for roughly 16:9 or 4:3 aspect ratio
    const cols = Math.ceil(Math.sqrt(total * 1.5));
    const rows = Math.ceil(total / cols);
    
    // Pad array to fill the grid
    const displaySectors = [...sectorMap.sectors];
    while (displaySectors.length < cols * rows) {
      displaySectors.push('noStorage');
    }
    
    return { cols, rows, displaySectors };
  }, [sectorMap]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!sectorMap) return null;
    
    const counts = sectorMap.sectors.reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<SectorStatus, number>);
    
    return counts;
  }, [sectorMap]);

  if (!sectorMap) {
    return (
      <div className={`rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 ${compact ? 'h-48' : 'h-64'} flex items-center justify-center`}>
        <p className="text-[var(--color-text-muted)] text-sm">Sector map initializing...</p>
      </div>
    );
  }

  const { cols, displaySectors } = gridConfig;
  const sectorSize = compact ? 3 : 4;
  const gap = 1;

  return (
    <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">Sector Map</h3>
        <div className="flex gap-3 text-xs">
          {stats && (
            <>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: STATUS_COLORS.validated }} />
                {stats.validated || 0}
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: STATUS_COLORS.pending }} />
                {stats.pending || 0}
              </span>
              {(stats.writeError || stats.readError || stats.corrupt) > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: STATUS_COLORS.writeError }} />
                  {(stats.writeError || 0) + (stats.readError || 0) + (stats.corrupt || 0)}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Sector Grid */}
      <div 
        className="overflow-auto max-h-48 rounded-lg bg-[var(--color-bg)] p-2"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${sectorSize}px)`,
          gap: `${gap}px`,
          justifyContent: 'center',
        }}
      >
        {displaySectors.map((status, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1, delay: index * 0.0001 }}
            className="rounded-[1px]"
            style={{
              width: sectorSize,
              height: sectorSize,
              backgroundColor: STATUS_COLORS[status],
              boxShadow: status === 'writing' || status === 'verifying' 
                ? `0 0 ${compact ? 2 : 4}px ${STATUS_COLORS[status]}` 
                : 'none',
            }}
            title={`Sector ${index + 1}: ${STATUS_LABELS[status]}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {(['validated', 'writing', 'verifying', 'writeError', 'readError', 'corrupt', 'pending'] as SectorStatus[])
          .filter(status => stats?.[status] && stats[status] > 0)
          .map(status => (
            <div key={status} className="flex items-center gap-1">
              <div 
                className="w-3 h-3 rounded-[1px]"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="text-[var(--color-text-muted)]">{STATUS_LABELS[status]}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
