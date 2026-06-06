export type GenerationHistoryNode = {
  id: string;
  type: 'initial' | 'micro' | 'macro';
  label: string;
  timestamp: number;
  imageUrl: string;
  base64?: string;
  source?: string;
  isSelected?: boolean;
};

type MatrixHistoryItem = {
  id: string;
  label?: string;
  timestamp?: number;
  imageUrl?: string;
  url?: string;
  base64?: string;
  source?: string;
  type?: string;
  isSelected?: boolean;
};

type GenerationRecord = {
  id: string;
  type?: string;
  modification?: string;
  prompt?: string;
  timestamp?: number;
};

type ImageLookup = {
  id?: string;
  url?: string;
};

function resolveImageUrl(item: MatrixHistoryItem): string {
  let imageUrl = item.imageUrl || item.url || '';
  if (!imageUrl && item.base64) {
    imageUrl = `data:image/png;base64,${item.base64}`;
  }
  return imageUrl;
}

function findImageForGeneration(
  gen: GenerationRecord,
  images: ImageLookup[],
): ImageLookup | undefined {
  const direct = images.find((img) => img.id === gen.id);
  if (direct) return direct;

  const prefixed = images.find(
    (img) =>
      img.id?.startsWith(`${gen.id}-`) ||
      gen.id.startsWith((img.id ?? '').split('-').slice(0, -1).join('-')),
  );
  if (prefixed) return prefixed;

  return images.find(
    (img) => img.id?.includes(gen.id) || gen.id.includes(img.id ?? ''),
  );
}

function isModificationGeneration(gen: GenerationRecord): boolean {
  return (
    gen.type === 'micro' ||
    gen.type === 'macro' ||
    gen.type === 'remove_furniture'
  );
}

/** Merge matrix visions with modification steps for history UI and session restore. */
export function buildGenerationHistoryFromSession(opts: {
  matrixHistory?: MatrixHistoryItem[];
  generations?: GenerationRecord[];
  generatedImages?: ImageLookup[];
  selectedImageId?: string | null;
}): GenerationHistoryNode[] {
  const {
    matrixHistory = [],
    generations = [],
    generatedImages = [],
    selectedImageId,
  } = opts;

  const fullHistory: GenerationHistoryNode[] = [];

  if (matrixHistory.length > 0) {
    for (const item of matrixHistory) {
      fullHistory.push({
        id: item.id,
        type:
          item.type === 'micro' || item.type === 'macro'
            ? item.type
            : 'initial',
        label: item.label || 'Wizja',
        timestamp: item.timestamp || Date.now(),
        imageUrl: resolveImageUrl(item),
        base64: item.base64,
        source: item.source,
        isSelected: item.isSelected || item.id === selectedImageId,
      });
    }
  }

  const modificationGens = generations.filter(isModificationGeneration);
  const existingIds = new Set(fullHistory.map((h) => h.id));

  for (const gen of modificationGens) {
    const matchingImage = findImageForGeneration(gen, generatedImages);
    const nodeId = matchingImage?.id ?? gen.id;
    if (existingIds.has(nodeId)) continue;

    fullHistory.push({
      id: nodeId,
      type: (gen.type === 'remove_furniture' ? 'micro' : gen.type) as
        | 'micro'
        | 'macro',
      label: gen.modification || gen.prompt?.substring(0, 30) || 'Modyfikacja',
      timestamp: gen.timestamp || Date.now(),
      imageUrl: matchingImage?.url || '',
    });
    existingIds.add(nodeId);
  }

  if (fullHistory.length === 0 && generations.length > 0) {
    return generations.map((gen) => {
      const matchingImage = findImageForGeneration(gen, generatedImages);
      return {
        id: matchingImage?.id ?? gen.id,
        type: (gen.type || 'initial') as GenerationHistoryNode['type'],
        label: gen.modification || gen.prompt?.substring(0, 30) || 'Generacja',
        timestamp: gen.timestamp || Date.now(),
        imageUrl: matchingImage?.url || '',
      };
    });
  }

  return fullHistory;
}

export function mergeMatrixHistoryRecords<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const byId = new Map<string, T>();
  for (const item of existing) byId.set(item.id, item);
  for (const item of incoming) {
    const prev = byId.get(item.id);
    byId.set(item.id, prev ? { ...prev, ...item } : item);
  }
  return Array.from(byId.values());
}
