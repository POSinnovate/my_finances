import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

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

  const validTotalPages = Math.max(1, totalPages || 1);
  const validCurrentPage = Math.min(Math.max(1, currentPage || 1), validTotalPages);

  const startItem = (validCurrentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(validCurrentPage * itemsPerPage, totalItems);

  // Generate page numbers to show (e.g. 1, 2, 3, 4, 5)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (validTotalPages <= 5) {
      for (let i = 1; i <= validTotalPages; i++) pages.push(i);
    } else {
      if (validCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', validTotalPages);
      } else if (validCurrentPage >= validTotalPages - 2) {
        pages.push(1, '...', validTotalPages - 3, validTotalPages - 2, validTotalPages - 1, validTotalPages);
      } else {
        pages.push(1, '...', validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, '...', validTotalPages);
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

      {/* Pagination Action Controls (Always visible when items exist) */}
      <div className="flex items-center gap-1.5 select-none">
        {/* Previous Page Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.max(1, validCurrentPage - 1))}
          disabled={validCurrentPage <= 1}
          icon={ChevronLeft}
          title="Página anterior"
          className="px-2.5 sm:px-3"
        >
          <span className="hidden sm:inline">Anterior</span>
        </Button>

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
            const isActive = pageNum === validCurrentPage;

            return (
              <Button
                key={pageNum}
                type="button"
                variant={isActive ? 'primary' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'w-8 h-8 p-0 font-mono text-xs font-bold',
                  isActive && 'shadow-md shadow-primary/20 scale-105'
                )}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.min(validTotalPages, validCurrentPage + 1))}
          disabled={validCurrentPage >= validTotalPages}
          title="Página siguiente"
          className="px-2.5 sm:px-3"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="w-4 h-4 ml-0.5" />
        </Button>
      </div>
    </div>
  );
}
