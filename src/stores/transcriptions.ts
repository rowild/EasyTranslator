import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db, type Transcription } from '../db/db';

const createVariantGroupId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

type CreateTranscriptionInput = Omit<Transcription, 'id' | 'createdAt' | 'variantGroupId' | 'variantOfId'>;

export const useTranscriptionsStore = defineStore('transcriptions', () => {
  const items = ref<Transcription[]>([]);
  const isLoaded = ref(false);

  const loadAll = async () => {
    items.value = await db.transcriptions.orderBy('createdAt').reverse().toArray();
    isLoaded.value = true;
  };

  const getById = async (id: number) => db.transcriptions.get(id);

  const addNew = async (
    input: CreateTranscriptionInput,
    opts?: { variantOfId?: number | null; variantGroupId?: string }
  ) => {
    const record: Omit<Transcription, 'id'> = {
      createdAt: Date.now(),
      audioBlob: input.audioBlob,
      sourceText: input.sourceText,
      sourceLang: input.sourceLang,
      targetCodes: input.targetCodes,
      translations: input.translations,
      variantGroupId: opts?.variantGroupId ?? createVariantGroupId(),
      variantOfId: opts?.variantOfId ?? null,
    };

    const id = await db.transcriptions.add(record);
    const saved: Transcription = { ...record, id: Number(id) };
    items.value.unshift(saved);
    return saved;
  };

  const remove = async (id: number) => {
    await db.transcriptions.delete(id);
    items.value = items.value.filter(item => item.id !== id);
  };

  return {
    items,
    isLoaded,
    loadAll,
    getById,
    addNew,
    remove,
  };
});

