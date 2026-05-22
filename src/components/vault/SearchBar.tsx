/**
 * 搜索栏组件
 * 用于 VaultScreen，通过 VaultContext.setSearchQuery 实时过滤文件
 */
import { useVault } from '../../context/VaultContext';

export function SearchBar() {
  const { state, setSearchQuery } = useVault();
  return (
    <div className="search-bar">
      <input
        className="search-bar__input"
        type="text"
        placeholder="搜索文件夹..."
        value={state.searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
