'use client';
import React, { useRef, useCallback, useEffect, useState } from 'react';

interface ResizableTableProps {
  children: React.ReactNode;
  className?: string;
}

export default function ResizableTable({ children, className = '' }: ResizableTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [isResizable, setIsResizable] = useState(false);

  const initResizers = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;

    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    const ths = headerRow.querySelectorAll('th');
    if (ths.length === 0) return;

    // Remove any existing resizers
    table.querySelectorAll('.col-resizer').forEach((el) => el.remove());

    // Capture NATURAL widths before switching to fixed layout
    const naturalWidths: number[] = [];
    ths.forEach((th) => {
      naturalWidths.push(th.getBoundingClientRect().width);
    });

    // Now apply fixed layout with captured natural widths
    table.style.tableLayout = 'fixed';

    ths.forEach((th, i) => {
      th.style.width = `${naturalWidths[i]}px`;
      th.style.minWidth = '50px';
      th.style.position = 'relative';
      th.style.overflow = 'hidden';
      th.style.textOverflow = 'ellipsis';
    });

    // Apply overflow hidden to all td cells too
    table.querySelectorAll('td').forEach((td) => {
      td.style.overflow = 'hidden';
      td.style.textOverflow = 'ellipsis';
    });

    // Add resizer handles to all but the last th
    for (let i = 0; i < ths.length - 1; i++) {
      const th = ths[i];
      const resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      th.appendChild(resizer);

      const nextTh = ths[i + 1];

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = th.getBoundingClientRect().width;
        const nextStartWidth = nextTh.getBoundingClientRect().width;

        resizer.classList.add('col-resizer-active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (ev: MouseEvent) => {
          const diff = ev.clientX - startX;
          const newWidth = Math.max(50, startWidth + diff);
          const nextNewWidth = Math.max(50, nextStartWidth - diff);
          th.style.width = `${newWidth}px`;
          nextTh.style.width = `${nextNewWidth}px`;
        };

        const onMouseUp = () => {
          resizer.classList.remove('col-resizer-active');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      };

      resizer.addEventListener('mousedown', onMouseDown);
    }

    setIsResizable(true);
  }, []);

  useEffect(() => {
    // Wait for the table content to render fully before measuring
    const timer = setTimeout(initResizers, 250);
    return () => clearTimeout(timer);
  }, [initResizers]);

  // Re-initialize when children change (data loads)
  useEffect(() => {
    if (isResizable) {
      const timer = setTimeout(() => {
        const table = tableRef.current;
        if (!table) return;
        const existing = table.querySelectorAll('.col-resizer');
        if (existing.length === 0) {
          // Reset fixed layout so we can re-measure natural widths
          table.style.tableLayout = '';
          table.querySelectorAll('th').forEach((th) => {
            th.style.width = '';
          });
          initResizers();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [children, isResizable, initResizers]);

  return (
    <table
      ref={tableRef}
      className={`${className}`}
    >
      {children}
    </table>
  );
}
