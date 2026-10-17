'use client';

import React from 'react';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrCodeSvg: React.FC<QrCodeSvgProps> = ({ value, size = 180, className = '' }) => {
  const gridSize = 21;
  const cells: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));

  const drawFinder = (startX: number, startY: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (
          r === 0 || r === 6 || c === 0 || c === 6 ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          cells[startY + r][startX + c] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(gridSize - 7, 0);
  drawFinder(0, gridSize - 7);

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= gridSize - 8) ||
        (r >= gridSize - 8 && c < 8) ||
        (r >= 9 && r <= 11 && c >= 9 && c <= 11)
      ) {
        continue;
      }
      const pseudoBit = ((hash * (r + 1) * (c + 1) + (r * 17) + (c * 23)) % 10) > 4;
      cells[r][c] = pseudoBit;
    }
  }

  const cellSize = 100 / gridSize;

  return (
    <div 
      className={`relative inline-flex items-center justify-center p-3 bg-white rounded-xl shadow-inner border border-slate-200 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        shapeRendering="crispEdges"
      >
        <rect width="100" height="100" fill="#ffffff" />
        {cells.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="px-1.5 py-0.5 bg-emerald-700 text-white text-[9px] font-bold rounded-sm tracking-wider shadow">
          TIRF
        </div>
      </div>
    </div>
  );
};
