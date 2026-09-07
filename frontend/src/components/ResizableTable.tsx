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

    // Keep table-layout: auto so columns size naturally based on content.
    // Only switch to fixed when user manually drags a resizer.
    table.style.tableLayout = 'auto';

    // Ensure all th cells have proper styling to prevent overlap
    ths.forEach((th) => {
      const isSticky = th.classList.contains('sticky');
      if (!isSticky) {
        th.style.position = 'relative';
      }
      th.style.whiteSpace = 'nowrap';
      th.style.overflow = 'hidden';
      th.style.textOverflow = 'ellipsis';
    });

    // Ensure all td cells have proper styling to prevent overlap
    table.querySelectorAll('td').forEach((td) => {
      td.style.overflow = 'hidden';
      td.style.textOverflow = 'ellipsis';
      td.style.whiteSpace = 'nowrap';
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

        // Switch to fixed layout on first resize so widths become explicit
        if (table.style.tableLayout !== 'fixed') {
          const allThs = headerRow.querySelectorAll('th');
          const currentWidths: number[] = [];
          allThs.forEach((t) => {
            currentWidths.push(Math.max(80, t.getBoundingClientRect().width));
          });
          table.style.tableLayout = 'fixed';
          allThs.forEach((t, idx) => {
            t.style.width = `${currentWidths[idx]}px`;
            t.style.minWidth = t.classList.contains('sticky') ? '70px' : '60px';
          });
        }

        const startX = e.clientX;
        const startWidth = th.getBoundingClientRect().width;
        const nextStartWidth = nextTh ? nextTh.getBoundingClientRect().width : 100;

        resizer.classList.add('col-resizer-active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (ev: MouseEvent) => {
          const diff = ev.clientX - startX;
          const newWidth = Math.max(60, startWidth + diff);
          th.style.width = `${newWidth}px`;
          if (nextTh && !nextTh.classList.contains('sticky')) {
            const nextNewWidth = Math.max(60, nextStartWidth - diff);
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

