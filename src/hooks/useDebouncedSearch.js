import { useEffect, useState } from 'react';

export function useDebouncedSearch(delay = 350) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), delay);
    return () => clearTimeout(timer);
  }, [searchInput, delay]);

  return { searchInput, setSearchInput, search };
}
