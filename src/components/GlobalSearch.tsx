import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FolderKanban, MapPin, Tag, DollarSign, ChevronRight } from 'lucide-react';
import { Input } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import type { SearchResult, SearchResultType } from '@/types';
import { CATEGORY_LABELS } from '@/types';
import { cn } from '@/lib/utils';

const SEARCH_GROUP_CONFIG: Record<SearchResultType, { label: string; icon: typeof FolderKanban; color: string }> = {
  project: { label: '项目', icon: FolderKanban, color: 'text-fuchsia-500' },
  branch: { label: '院区', icon: MapPin, color: 'text-blue-500' },
  price: { label: '价格', icon: DollarSign, color: 'text-emerald-500' },
  version: { label: '版本', icon: Tag, color: 'text-amber-500' },
};

interface HighlightTextProps {
  text: string;
  keyword: string;
  className?: string;
}

function HighlightText({ text, keyword, className }: HighlightTextProps) {
  if (!keyword.trim()) {
    return <span className={className}>{text}</span>;
  }

  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  const index = lowerText.indexOf(lowerKeyword);

  if (index === -1) {
    return <span className={className}>{text}</span>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + keyword.length);
  const after = text.slice(index + keyword.length);

  return (
    <span className={className}>
      {before}
      <mark className="bg-brand-gold-200/60 text-brand-navy-700 px-0.5 rounded font-semibold">
        {match}
      </mark>
      {after}
    </span>
  );
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const globalSearch = useAppStore((s) => s.globalSearch);
  const currentUser = useAppStore((s) => s.currentUser);

  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    return globalSearch(debouncedKeyword, 30);
  }, [debouncedKeyword, globalSearch]);

  const groupedResults = useMemo(() => {
    const groups: Record<SearchResultType, SearchResult[]> = {
      project: [],
      branch: [],
      price: [],
      version: [],
    };
    searchResults.forEach((r) => {
      if (groups[r.type]) {
        groups[r.type].push(r);
      }
    });
    return groups;
  }, [searchResults]);

  const flatResults = useMemo(() => {
    const results: SearchResult[] = [];
    (Object.keys(SEARCH_GROUP_CONFIG) as SearchResultType[]).forEach((type) => {
      results.push(...groupedResults[type]);
    });
    return results;
  }, [groupedResults]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchResults]);

  useEffect(() => {
    if (keyword.trim() && searchResults.length > 0) {
      setOpen(true);
    } else if (!keyword.trim()) {
      setOpen(false);
    }
  }, [keyword, searchResults]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      setKeyword('');
      navigate(result.route);
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || flatResults.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % flatResults.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            handleSelect(flatResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [open, flatResults, selectedIndex, handleSelect]
  );

  const isStoreManager = currentUser?.role === 'store-manager';

  let globalIndex = 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md mx-auto">
      <Input
        ref={inputRef}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onFocus={() => keyword.trim() && searchResults.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        prefix={<Search className="w-4 h-4 text-slate-400" />}
        suffix={
          keyword ? (
            <button
              onClick={() => {
                setKeyword('');
                setOpen(false);
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null
        }
        placeholder={isStoreManager ? '搜索本院项目、价格...' : '搜索项目、院区、价格、版本...'}
        size="large"
        className={cn(
          '!rounded-full !bg-slate-50 !border-slate-200',
          'focus-within:!border-brand-gold-500 focus-within:!ring-2 focus-within:!ring-brand-gold-100',
          'transition-all duration-200'
        )}
        style={{ borderRadius: '20px' }}
      />

      <AnimatePresence>
        {open && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50"
            style={{ maxHeight: '400px', overflowY: 'auto' }}
          >
            {(Object.keys(SEARCH_GROUP_CONFIG) as SearchResultType[]).map((type) => {
              const groupItems = groupedResults[type];
              if (groupItems.length === 0) return null;

              const GroupIcon = SEARCH_GROUP_CONFIG[type].icon;

              return (
                <div key={type} className="first:pt-2">
                  <div className="px-4 py-2 flex items-center gap-2">
                    <div className="w-0.5 h-3.5 bg-brand-gold-500 rounded-full" />
                    <span className="text-xs font-bold text-brand-navy-600 uppercase tracking-wider">
                      {SEARCH_GROUP_CONFIG[type].label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {groupItems.length}
                    </span>
                  </div>

                  {groupItems.map((item) => {
                    const itemIndex = globalIndex;
                    globalIndex++;
                    const isSelected = selectedIndex === itemIndex;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          'w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors',
                          isSelected
                            ? 'bg-brand-gold-50/80'
                            : 'hover:bg-brand-gold-50/50'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            type === 'project' && 'bg-fuchsia-50',
                            type === 'branch' && 'bg-blue-50',
                            type === 'price' && 'bg-emerald-50',
                            type === 'version' && 'bg-amber-50'
                          )}
                        >
                          <GroupIcon
                            className={cn('w-4 h-4', SEARCH_GROUP_CONFIG[type].color)}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">
                            <HighlightText text={item.title} keyword={debouncedKeyword} />
                          </div>
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            {item.subtitle}
                          </div>
                        </div>

                        {item.price !== undefined && (
                          <div className="flex-shrink-0 text-right">
                            <span className="text-sm font-bold text-brand-gold-600">
                              ¥{item.price.toLocaleString()}
                            </span>
                          </div>
                        )}

                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </button>
                    );
                  })}

                  {type !== 'version' && groupedResults[type].length > 0 && (
                    <div className="px-4">
                      <div className="h-px bg-slate-100 my-1" />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↓</kbd>
                  选择
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Enter</kbd>
                  跳转
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Esc</kbd>
                  关闭
                </span>
              </div>
              <span>共 {searchResults.length} 条结果</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
