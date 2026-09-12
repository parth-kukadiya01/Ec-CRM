'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Columns, Check, RotateCcw, Search, Eye, X, Settings2 } from 'lucide-react';

export interface ColumnDefinition {
  key: string;
  label: string;
  group?: string;
  locked?: boolean; // Cannot be hidden, e.g. Actions or No.
}

export interface ColumnPreset {
  id: string;
  label: string;
  columnKeys: string[];
}

interface ColumnVisibilityDropdownProps {
  columns: ColumnDefinition[];
  visibleColumns: Record<string, boolean>;
  onChange: (newVisibility: Record<string, boolean>) => void;
  presets?: ColumnPreset[];
  defaultVisibleKeys?: string[];
  storageKey?: string;
  className?: string;
}

export default function ColumnVisibilityDropdown({
  columns,
  visibleColumns,
  onChange,
  presets = [],
  defaultVisibleKeys,
  storageKey,
  className = '',
}: ColumnVisibilityDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleColumn = (key: string) => {
    const col = columns.find(c => c.key === key);
    if (col?.locked) return;

    const next = {
      ...visibleColumns,
      [key]: !visibleColumns[key],
    };
    onChange(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save column visibility to localStorage', err);
      }
    }
  };

  const applyPreset = (presetKeys: string[]) => {
    const next: Record<string, boolean> = {};
    columns.forEach(col => {
      if (col.locked) {
        next[col.key] = true;
      } else {
        next[col.key] = presetKeys.includes(col.key);
      }
    });
    onChange(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save column visibility to localStorage', err);
      }
    }
  };

  const showAll = () => {
    const next: Record<string, boolean> = {};
    columns.forEach(col => {
      next[col.key] = true;
    });
    onChange(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {}
    }
  };

  const resetToDefault = () => {
    const next: Record<string, boolean> = {};
    const defaultKeys = defaultVisibleKeys || columns.map(c => c.key);
    columns.forEach(col => {
      if (col.locked) {
        next[col.key] = true;
      } else {
        next[col.key] = defaultKeys.includes(col.key);
      }
    });
    onChange(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {}
    }
  };

  const visibleCount = columns.filter(c => visibleColumns[c.key] !== false).length;
  const filteredColumns = columns.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 text-xs font-bold rounded-xs border transition-all flex items-center gap-1.5 shadow-xs ${
          isOpen
            ? 'bg-[#2271b1] text-white border-[#135e96]'
            : 'bg-white text-[#2c3338] border-[#c3c4c7] hover:bg-[#f0f0f1] hover:border-[#8c8f94]'
        }`}
        title="Customize visible columns"
      >
        <Settings2 className="w-3.5 h-3.5" />
        <span>Columns</span>
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            isOpen ? 'bg-white text-[#2271b1]' : 'bg-[#f0f0f1] text-[#50575e] border border-[#c3c4c7]'
          }`}
        >
          {visibleCount}/{columns.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 bg-white border border-[#c3c4c7] rounded-sm shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[480px]">
          {/* Header */}
          <div className="p-3 bg-[#f6f7f7] border-b border-[#c3c4c7] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Columns className="w-4 h-4 text-[#2271b1]" />
              <span className="text-xs font-bold text-[#1d2327]">Customize Columns</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#50575e] hover:text-[#1d2327] text-sm font-bold"
            >
              ✕
            </button>
          </div>

          {/* Presets Bar */}
          {presets.length > 0 && (
            <div className="p-2.5 bg-white border-b border-[#e0e0e0] flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-[10px] font-bold uppercase text-[#50575e] mr-1">Views:</span>
              {presets.map(p => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.columnKeys)}
                  className="px-2 py-0.5 bg-[#f0f0f1] hover:bg-[#2271b1] hover:text-white text-[#2c3338] font-bold rounded-xs border border-[#c3c4c7] transition-colors"
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={showAll}
                className="px-2 py-0.5 bg-[#f0f0f1] hover:bg-[#2271b1] hover:text-white text-[#2c3338] font-bold rounded-xs border border-[#c3c4c7] transition-colors"
              >
                All
              </button>
            </div>
          )}

          {/* Search column input */}
          <div className="p-2 border-b border-[#e0e0e0] bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#50575e] absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter column names..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-[#8c8f94] rounded-xs outline-none focus:border-[#2271b1]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1.5 text-xs text-[#50575e] hover:text-[#1d2327]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Columns Checkbox List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredColumns.map(col => {
              const isChecked = visibleColumns[col.key] !== false;
              return (
                <label
                  key={col.key}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xs text-xs cursor-pointer transition-colors ${
                    isChecked ? 'bg-[#f0f6fc] text-[#1d2327] font-semibold' : 'text-[#787c82] hover:bg-[#f6f7f7]'
                  } ${col.locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={col.locked}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded-xs border-[#8c8f94] text-[#2271b1] focus:ring-0 cursor-pointer"
                    />
                    <span>{col.label}</span>
                  </div>
                  {col.locked && (
                    <span className="text-[10px] text-[#8c8f94] font-normal uppercase">Required</span>
                  )}
                </label>
              );
            })}
            {filteredColumns.length === 0 && (
              <div className="py-4 text-center text-xs text-[#50575e]">No matching columns</div>
            )}
          </div>

          {/* Footer with Reset */}
          <div className="p-2.5 bg-[#f6f7f7] border-t border-[#c3c4c7] flex items-center justify-between text-xs">
            <button
              onClick={resetToDefault}
              className="flex items-center gap-1 text-[#2271b1] hover:underline font-bold text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Default</span>
            </button>
            <span className="text-[11px] text-[#50575e] font-medium">
              {visibleCount} of {columns.length} shown
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
