import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  label?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  label = 'registros',
  className,
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show (e.g. 1, 2, 3, 4, 5)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={cn(
        'p-3 sm:p-4 rounded-2xl bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md',
        className
      )}
    >
      {/* Item Range Info */}
      <div className="text-xs text-foreground/60 font-medium text-center sm:text-left">
        Mostrando{' '}
        <strong className="text-foreground font-mono">
          {startItem} - {endItem}
        </strong>{' '}
        de <strong className="text-primary font-mono">{totalItems}</strong> {label}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1.5 select-none">
          {/* Previous Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-elevated hover:bg-secondary/60 border border-border hover:border-primary/40 text-foreground/80 hover:text-foreground text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
            title="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-foreground/40 font-bold">
                    ...
                  </span>
                );
              }

              const pageNum = p as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    'w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center font-mono',
                    isActive
                      ? 'bg-primary text-background shadow-md shadow-primary/20 font-black scale-105'
                      : 'bg-surface-elevated hover:bg-secondary/60 text-foreground/70 hover:text-foreground border border-border hover:border-primary/40'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-elevated hover:bg-secondary/60 border border-border hover:border-primary/40 text-foreground/80 hover:text-foreground text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
            title="Página siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
