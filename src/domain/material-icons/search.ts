import type { MaterialIconDef } from './icons.data';

// Material Symbols palette search — query tokens matched against icon name,
// categories (fonts.google.com/icons) and tags. All tokens must be present (AND).
export function filterIcons(icons: MaterialIconDef[], query: string, category: string): MaterialIconDef[] {
  const cat = category === 'all' || category === '' ? null : category;
  const tokens = query.toLowerCase().split(/\s+/).filter((tk) => tk.length > 0);
  return icons.filter((i) => {
    if (cat !== null && !i.categories.includes(cat)) return false;
    if (tokens.length === 0) return true;
    const hay = `${i.name} ${i.categories.join(' ')} ${i.tags.join(' ')}`.toLowerCase();
    return tokens.every((tk) => hay.includes(tk));
  });
}

export function categoriesOf(icons: MaterialIconDef[]): string[] {
  return [...new Set(icons.flatMap((i) => i.categories))].sort();
}
