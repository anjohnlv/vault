/**
 * 侧栏搜索栏组件
 * 用于 Sidebar，支持切换搜索模式：文件夹名搜索 / 文件名搜索
 */
import { useVault } from '../../../core/context/VaultContext';

interface SearchBarProps {
  searchMode: 'folder' | 'file';
  onSearchModeChange: (mode: 'folder' | 'file') => void;
}

export function SearchBar({ searchMode, onSearchModeChange }: SearchBarProps) {
  const { state, setSearchQuery, setFileFilter } = useVault();

  const handleChange = (value: string) => {
    setSearchQuery(value);
    if (searchMode === 'file') {
      setFileFilter(value);
    }
  };

  return (
    <div className="search-bar">
      <div className="search-bar__tabs">
        <button
          className={`search-bar__tab ${searchMode === 'folder' ? 'search-bar__tab--active' : ''}`}
          onClick={() => {
            if (searchMode === 'file') setFileFilter('');
            onSearchModeChange('folder');
          }}
        >
          搜索文件夹
        </button>
        <button
          className={`search-bar__tab ${searchMode === 'file' ? 'search-bar__tab--active' : ''}`}
          onClick={() => {
            onSearchModeChange('file');
            if (state.searchQuery.trim()) setFileFilter(state.searchQuery);
          }}
        >
          搜索文件
        </button>
      </div>
      <input
        className="search-bar__input"
        type="text"
        placeholder={searchMode === 'folder' ? '搜索文件夹...' : '搜索文件...'}
        value={state.searchQuery}
        onChange={(e) => handleChange(e.target.value)}
      />
    </div>
  );
}
