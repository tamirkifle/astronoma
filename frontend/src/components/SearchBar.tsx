import React, { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stars, planets, or constellations..."
          className="w-[400px] px-6 py-4 bg-white/10 backdrop-blur-xl rounded-2xl 
                     text-white placeholder-white/50 border border-white/20
                     focus:outline-none focus:border-white/40 focus:bg-white/15
                     transition-all duration-300"
        />
        <svg 
          className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>
    </form>
  );
}
