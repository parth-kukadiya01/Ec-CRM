'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number, option?: Option) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-white border ${
          isOpen ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-slate-300'
        } rounded-lg text-left text-sm text-slate-900 transition-all shadow-xs hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : <span className="text-slate-400">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden max-h-60 flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              className="w-full bg-transparent text-sm text-slate-900 focus:outline-none placeholder-slate-400"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="overflow-y-auto max-h-48 p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-4 text-xs text-center text-slate-400">No matching items found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      onChange(opt.value, opt);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                      isSelected
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex flex-col text-left truncate">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && <span className="text-xs text-slate-500">{opt.sublabel}</span>}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
