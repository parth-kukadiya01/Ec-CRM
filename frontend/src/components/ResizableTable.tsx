'use client';
import React, { useRef, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface ResizableTableProps {
  children: React.ReactNode;
  className?: string;
  storageKey?: string;
}

export default function ResizableTable({
  children,
  className = '',
  storageKey,
}: ResizableTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const effectiveKey = storageKey || (pathname ? `table_sz_${pathname.replace(/\//g, '_')}` : 'table_sz_default');
  const COLS_KEY = `${effectiveKey}_cols`;
  const ROW_DEF_KEY = `${effectiveKey}_row_def`;
  const ROW_MAP_KEY = `${effectiveKey}_rows`;

  // Helper: column identifier
  const getColKey = (th: HTMLElement, index: number): string => {
    return (
      th.getAttribute('data-col') ||
      th.getAttribute('data-field') ||
      th.innerText.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().trim() ||
      `col_${index}`
    );
  };

  // Helper: row identifier
  const getRowKey = (tr: HTMLElement, index: number): string => {
    return (
      tr.getAttribute('data-row-id') ||
      tr.getAttribute('data-id') ||
      tr.id ||
      `row_${index}`
    );
  };

  // Storage getters & setters
  const getSavedCols = useCallback((): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(COLS_KEY) || localStorage.getItem(effectiveKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }, [COLS_KEY, effectiveKey]);

  const saveCols = useCallback((cols: Record<string, number>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify(cols));
    } catch {}
  }, [COLS_KEY]);

  const getSavedRowDef = useCallback((): number | null => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(ROW_DEF_KEY);
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  }, [ROW_DEF_KEY]);

  const saveRowDef = useCallback((h: number | null) => {
    if (typeof window === 'undefined') return;
    try {
      if (h === null) localStorage.removeItem(ROW_DEF_KEY);
      else localStorage.setItem(ROW_DEF_KEY, String(h));
    } catch {}
  }, [ROW_DEF_KEY]);

  const getSavedRowMap = useCallback((): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(ROW_MAP_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }, [ROW_MAP_KEY]);

  const saveRowMap = useCallback((map: Record<string, number>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ROW_MAP_KEY, JSON.stringify(map));
    } catch {}
  }, [ROW_MAP_KEY]);

  // Apply row height to a single tr and its cells
  const applyHeightToRow = useCallback((tr: HTMLElement, h: number) => {
    tr.style.height = `${h}px`;
    tr.style.minHeight = `${h}px`;
    tr.querySelectorAll('td').forEach((td) => {
      const el = td as HTMLElement;
      el.style.height = `${h}px`;
      el.style.maxHeight = `${h}px`;
      el.style.boxSizing = 'border-box';
      el.style.overflow = 'hidden';

      // Keep inner scrollable elements sized proportionally
      const innerScroll = el.querySelector('.overflow-y-auto, .max-h-full');
      if (innerScroll) {
        (innerScroll as HTMLElement).style.maxHeight = `${Math.max(22, h - 8)}px`;
      }
    });
  }, []);

  // Reset row height to auto content fit
  const resetRowHeight = useCallback((tr: HTMLElement, rowKey?: string) => {
    tr.style.height = 'auto';
    tr.style.minHeight = 'auto';
    tr.querySelectorAll('td').forEach((td) => {
      const el = td as HTMLElement;
      el.style.height = 'auto';
      el.style.maxHeight = 'none';
      const innerScroll = el.querySelector('.overflow-y-auto, .max-h-full');
      if (innerScroll) {
        (innerScroll as HTMLElement).style.maxHeight = 'none';
      }
    });
    if (rowKey) {
      const saved = getSavedRowMap();
      delete saved[rowKey];
      saveRowMap(saved);
    }
  }, [getSavedRowMap, saveRowMap]);

  // Main engine to attach resizers and apply dimensions
  const applyAll = useCallback(() => {
    const table = tableRef.current;
    if (!table) return;

    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;

    const ths = Array.from(headerRow.querySelectorAll('th')) as HTMLElement[];
    if (ths.length === 0) return;

    const savedCols = getSavedCols();
    const hasSavedCols = Object.keys(savedCols).length > 0;
    const defaultRowH = getSavedRowDef();
    const savedRowMap = getSavedRowMap();

    // Clean up existing resizers
    table.querySelectorAll('.col-resizer, .row-resizer, .corner-resizer').forEach((el) => el.remove());

    // 1. HORIZONTAL SETUP: Apply column widths
    ths.forEach((th, idx) => {
      const isSticky = th.classList.contains('sticky');
      if (!isSticky) {
        th.style.position = 'relative';
      }
      th.style.whiteSpace = 'nowrap';
      th.style.overflow = 'hidden';
      th.style.textOverflow = 'ellipsis';
      th.style.boxSizing = 'border-box';

      const key = getColKey(th, idx);
      if (hasSavedCols && savedCols[key]) {
        const w = savedCols[key];
        th.style.width = `${w}px`;
        th.style.minWidth = `${w}px`;
        th.style.maxWidth = `${w}px`;
      }
    });

    // Apply fixed table layout and exact width if saved (NO min-width: 100% so columns can decrease!)
    if (hasSavedCols) {
      table.style.tableLayout = 'fixed';
      let totalW = 0;
      ths.forEach((th, idx) => {
        const key = getColKey(th, idx);
        const w = savedCols[key] || Math.round(th.getBoundingClientRect().width) || 100;
        totalW += w;
      });
      table.style.width = `${totalW}px`;
      table.style.minWidth = 'unset';
    }

    // 2. VERTICAL SETUP: Apply row heights to tbody
    const tbody = table.querySelector('tbody');
    const tbodyRows = tbody ? (Array.from(tbody.querySelectorAll('tr')) as HTMLElement[]) : [];

    tbodyRows.forEach((tr, rIdx) => {
      const rowKey = getRowKey(tr, rIdx);
      const rowHeight = savedRowMap[rowKey] || defaultRowH;
      if (rowHeight) {
        applyHeightToRow(tr, rowHeight);
      }

      // Ensure cells have positioning and proper box sizing
      tr.querySelectorAll('td').forEach((td) => {
        const cell = td as HTMLElement;
        if (!cell.classList.contains('sticky')) {
          cell.style.position = 'relative';
        }
        cell.style.boxSizing = 'border-box';
      });

      // Attach row-resizer handle on the first cell of each tbody row
      const firstTd = tr.querySelector('td') as HTMLElement;
      if (firstTd) {
        const rowResizer = document.createElement('div');
        rowResizer.className = 'row-resizer';
        rowResizer.title = 'Drag to resize row height. Double-click to auto-fit';
        firstTd.appendChild(rowResizer);

        // Double-click to auto-fit this row
        rowResizer.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          resetRowHeight(tr, rowKey);
        });

        // Drag to resize this row
        rowResizer.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const startY = e.clientY;
          const startHeight = Math.round(tr.getBoundingClientRect().height);
          rowResizer.classList.add('row-resizer-active');
          document.body.style.cursor = 'row-resize';
          document.body.style.userSelect = 'none';

          const onMouseMove = (ev: MouseEvent) => {
            const diff = ev.clientY - startY;
            const newH = Math.max(26, Math.min(350, Math.round(startHeight + diff)));
            applyHeightToRow(tr, newH);
          };

          const onMouseUp = (ev: MouseEvent) => {
            rowResizer.classList.remove('row-resizer-active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const finalDiff = ev.clientY - startY;
            const finalH = Math.max(26, Math.min(350, Math.round(startHeight + finalDiff)));
            const map = getSavedRowMap();
            map[rowKey] = finalH;
            saveRowMap(map);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      }
    });

    // 3. ATTACH COLUMN & HEADER RESIZERS
    ths.forEach((th, i) => {
      // Horizontal Column Resizer
      const colResizer = document.createElement('div');
      colResizer.className = 'col-resizer';
      colResizer.title = 'Drag to resize column width. Double-click to auto-fit';
      th.appendChild(colResizer);

      // Corner Resizer (both horizontal and vertical simultaneously)
      const cornerResizer = document.createElement('div');
      cornerResizer.className = 'corner-resizer';
      cornerResizer.title = 'Drag corner to resize both width and row height';
      th.appendChild(cornerResizer);

      // Header Row Resizer (resizes default row height for all rows)
      if (i === 0) {
        const headerRowResizer = document.createElement('div');
        headerRowResizer.className = 'row-resizer';
        headerRowResizer.title = 'Drag to resize default row height for all rows';
        th.appendChild(headerRowResizer);

        headerRowResizer.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          saveRowDef(null);
          tbodyRows.forEach((r, idx) => resetRowHeight(r, getRowKey(r, idx)));
        });

        headerRowResizer.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const startY = e.clientY;
          const sampleRow = tbodyRows[0];
          const startH = sampleRow ? Math.round(sampleRow.getBoundingClientRect().height) : 40;

          headerRowResizer.classList.add('row-resizer-active');
          document.body.style.cursor = 'row-resize';
          document.body.style.userSelect = 'none';

          const onMouseMove = (ev: MouseEvent) => {
            const diff = ev.clientY - startY;
            const newH = Math.max(26, Math.min(300, Math.round(startH + diff)));
            tbodyRows.forEach((r) => applyHeightToRow(r, newH));
          };

          const onMouseUp = (ev: MouseEvent) => {
            headerRowResizer.classList.remove('row-resizer-active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const finalDiff = ev.clientY - startY;
            const finalH = Math.max(26, Math.min(300, Math.round(startH + finalDiff)));
            saveRowDef(finalH);
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        });
      }

      // Column double-click to auto-fit
      colResizer.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const currentMap = getSavedCols();
        const key = getColKey(th, i);

        // Reset to measure natural content width
        th.style.width = 'auto';
        th.style.minWidth = '30px';
        th.style.maxWidth = 'none';

        const naturalWidth = Math.max(40, th.scrollWidth + 24);
        th.style.width = `${naturalWidth}px`;
        th.style.minWidth = `${naturalWidth}px`;
        th.style.maxWidth = `${naturalWidth}px`;

        currentMap[key] = naturalWidth;
        saveCols(currentMap);

        // Recalculate total table width
        let totalW = 0;
        ths.forEach((t, idx) => {
          const k = getColKey(t, idx);
          totalW += currentMap[k] || Math.round(t.getBoundingClientRect().width);
        });
        table.style.tableLayout = 'fixed';
        table.style.width = `${totalW}px`;
        table.style.minWidth = 'unset';
      });

      // Column drag
      colResizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const allThs = Array.from(headerRow.querySelectorAll('th')) as HTMLElement[];
        const currentWidths: Record<string, number> = getSavedCols();

        allThs.forEach((t, idx) => {
          const k = getColKey(t, idx);
          if (!currentWidths[k]) {
            currentWidths[k] = Math.round(t.getBoundingClientRect().width);
          }
          t.style.width = `${currentWidths[k]}px`;
          t.style.minWidth = `${currentWidths[k]}px`;
          t.style.maxWidth = `${currentWidths[k]}px`;
        });

        table.style.tableLayout = 'fixed';
        let currentTotalWidth = Object.values(currentWidths).reduce((a, b) => a + b, 0);
        table.style.width = `${currentTotalWidth}px`;
        table.style.minWidth = 'unset';

        const startX = e.clientX;
        const colKey = getColKey(th, i);
        const startWidth = currentWidths[colKey] || Math.round(th.getBoundingClientRect().width);

        colResizer.classList.add('col-resizer-active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (ev: MouseEvent) => {
          const diff = ev.clientX - startX;
          // Decreasing down to 30px or expanding freely
          const newColWidth = Math.max(30, Math.round(startWidth + diff));

          th.style.width = `${newColWidth}px`;
          th.style.minWidth = `${newColWidth}px`;
          th.style.maxWidth = `${newColWidth}px`;

          currentWidths[colKey] = newColWidth;

          const newTotal = Object.values(currentWidths).reduce((a, b) => a + b, 0);
          table.style.width = `${newTotal}px`;
          table.style.minWidth = 'unset';
        };

        const onMouseUp = () => {
          colResizer.classList.remove('col-resizer-active');
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          saveCols(currentWidths);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      // Corner drag (both horizontal & vertical)
      cornerResizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const allThs = Array.from(headerRow.querySelectorAll('th')) as HTMLElement[];
        const currentWidths: Record<string, number> = getSavedCols();

        allThs.forEach((t, idx) => {
          const k = getColKey(t, idx);
          if (!currentWidths[k]) {
            currentWidths[k] = Math.round(t.getBoundingClientRect().width);
          }
          t.style.width = `${currentWidths[k]}px`;
          t.style.minWidth = `${currentWidths[k]}px`;
          t.style.maxWidth = `${currentWidths[k]}px`;
        });

        table.style.tableLayout = 'fixed';
        const startX = e.clientX;
        const startY = e.clientY;
        const colKey = getColKey(th, i);
        const startWidth = currentWidths[colKey] || Math.round(th.getBoundingClientRect().width);

        const sampleRow = tbodyRows[0];
        const startRowH = sampleRow ? Math.round(sampleRow.getBoundingClientRect().height) : 40;

        document.body.style.cursor = 'nwse-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (ev: MouseEvent) => {
          // Horizontal
          const diffX = ev.clientX - startX;
          const newColWidth = Math.max(30, Math.round(startWidth + diffX));
          th.style.width = `${newColWidth}px`;
          th.style.minWidth = `${newColWidth}px`;
          th.style.maxWidth = `${newColWidth}px`;
          currentWidths[colKey] = newColWidth;
          const newTotal = Object.values(currentWidths).reduce((a, b) => a + b, 0);
          table.style.width = `${newTotal}px`;
          table.style.minWidth = 'unset';

          // Vertical
          const diffY = ev.clientY - startY;
          const newH = Math.max(26, Math.min(300, Math.round(startRowH + diffY)));
          tbodyRows.forEach((r) => applyHeightToRow(r, newH));
        };

        const onMouseUp = (ev: MouseEvent) => {
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);

          saveCols(currentWidths);

          const finalDiffY = ev.clientY - startY;
          const finalH = Math.max(26, Math.min(300, Math.round(startRowH + finalDiffY)));
          saveRowDef(finalH);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
  }, [
    getSavedCols,
    saveCols,
    getSavedRowDef,
    saveRowDef,
    getSavedRowMap,
    saveRowMap,
    applyHeightToRow,
    resetRowHeight,
  ]);

  // Initial and reactive effects
  useEffect(() => {
    applyAll();
    const timer = setTimeout(applyAll, 120);
    return () => clearTimeout(timer);
  }, [applyAll, children]);

  // Observe tbody additions (e.g. data arrival from API, pagination)
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    const observer = new MutationObserver(() => {
      applyAll();
    });

    observer.observe(tbody, { childList: true, subtree: false });
    return () => observer.disconnect();
  }, [applyAll]);

  return (
    <div className="resizable-table-wrapper w-full flex flex-col">
      <div
        ref={containerRef}
        className="resizable-table-scroll w-full overflow-x-auto"
      >
        <table ref={tableRef} className={`resizable-table ${className}`}>
          {children}
        </table>
      </div>
    </div>
  );
}
