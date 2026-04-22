export default function Filters({
  categories,
  selectedCategory,
  sort,
  onCategoryChange,
  onSortChange,
}) {
  return (
    <div className="filters">
      <div className="filter-group">
        <label htmlFor="filter-category">Category</label>
        <select
          id="filter-category"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="filter-sort">Sort</label>
        <select
          id="filter-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="date_desc">Newest first</option>
          <option value="">By entry time</option>
        </select>
      </div>
    </div>
  );
}
