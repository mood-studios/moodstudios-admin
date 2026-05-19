export default function SearchField({ value, onChange, placeholder = 'Search…' }) {
  return (
    <label>
      Search
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
