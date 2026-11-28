export const BLOB_COLORWAYS = [
  { id: 'lavender', name: 'Lavender', color: 0xa79de3, swatch: '#B9B2F0' },
  { id: 'mint', name: 'Mint', color: 0x83c9ae, swatch: '#A9DCCB' },
  { id: 'ocean', name: 'Ocean', color: 0x72bcd4, swatch: '#98D3E3' },
  { id: 'peach', name: 'Peach', color: 0xe5a287, swatch: '#F1BBA2' },
  { id: 'rose', name: 'Rose', color: 0xd58caf, swatch: '#E6AFCA' },
  { id: 'butter', name: 'Butter', color: 0xd5b966, swatch: '#EBD88E' },
] as const;

export type BlobColorwayId = (typeof BLOB_COLORWAYS)[number]['id'];
const STORAGE_KEY = 'calmspace-blob-colorway';

export function readBlobColorway(): BlobColorwayId {
  try {
    const savedId = localStorage.getItem(STORAGE_KEY);
    return BLOB_COLORWAYS.find((choice) => choice.id === savedId)?.id ?? 'lavender';
  } catch {
    return 'lavender';
  }
}

export function saveBlobColorway(id: BlobColorwayId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Selection still applies for the current page when browser storage is unavailable.
  }
}
