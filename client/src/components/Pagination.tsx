import React from 'react';

interface PaginationProps {
  onPrev: () => void;
  onNext: () => void;
  disablePrev: boolean;
  disableNext: boolean;
  currentPage: number;
  loading: boolean;
  startIndex: number;
  endIndex: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  onPrev,
  onNext,
  disablePrev,
  disableNext,
  currentPage,
  loading,
  startIndex,
  endIndex,
}) => {
  return (
    <div className="pagination-wrapper">
      <div className="pagination-container">
        <button
          type="button"
          onClick={onPrev}
          disabled={disablePrev || loading}
          className="pagination-button button-compact"
        >
          &larr; Previous
        </button>
        
        <span className="pagination-info">
          Page {currentPage}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={disableNext || loading}
          className="pagination-button button-compact"
        >
          Next &rarr;
        </button>
      </div>
      {startIndex > 0 && (
        <div className="pagination-range">
          Showing {startIndex}–{endIndex} products
        </div>
      )}
    </div>
  );
};



