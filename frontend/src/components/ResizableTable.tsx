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
      naturalWidths.push(Math.max(80, th.getBoundingClientRect().width));
    });

    // Now apply fixed layout with captured natural widths
    table.style.tableLayout = 'fixed';

    ths.forEach((th, i) => {
      const isSticky = th.classList.contains('sticky');
      th.style.width = `${naturalWidths[i]}px`;
      th.style.minWidth = isSticky ? '70px' : '60px';
      if (!isSticky) {
        th.style.position = 'relative';
        th.style.overflow = 'hidden';
      }
      th.style.textOverflow = 'ellipsis';
    });

    // Apply overflow hidden to non-sticky td cells
    table.querySelectorAll('td').forEach((td) => {
      if (!td.classList.contains('sticky')) {
        td.style.overflow = 'hidden';
      }
      td.style.textOverflow = 'ellipsis';
    });

    // Add resizer handles to all but the last th
    for (let i = 0; i < ths.length - 1; i++) {
      const th = ths[i];
      if (th.classList.contains('sticky')) continue;

      const resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      th.appendChild(resizer);

      const nextTh = ths[i + 1];

      const onMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = th.getBoundingClientRect().width;
        const nextStartWidth = nextTh ? nextTh.getBoundingClientRect().width : 100;

        resizer.classList.add('col-resizer-active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (ev: MouseEvent) => {
          const diff = ev.clientX - startX;
          const newWidth = Math.max(50, startWidth + diff);
          th.style.width = `${newWidth}px`;
          if (nextTh && !nextTh.classList.contains('sticky')) {
            const nextNewWidth = Math.max(50, nextStartWidth - diff);
            nextTh.style.width = `${nextNewWidth}px`;
          }
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
    const timer = setTimeout(initResizers, 200);
    return () => clearTimeout(timer);
  }, [initResizers]);

  return (
    <div className="resizable-table-wrapper w-full overflow-x-auto">
      <table ref={tableRef} className={`resizable-table ${className}`}>
        {children}
      </table>
    </div>
  );
}
