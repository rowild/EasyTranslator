import Dexie, { type Table } from 'dexie';

export interface Conversation {
    id?: number;
    createdAt: number;
    sourceText: string;
    sourceLang: string;
    translatedText: string;
    targetLang: string;
}

export type AppMode = 'simple' | 'extended';

export interface AppSettings {
    id: 'app';
    mode: AppMode;
    apiKey: string | null;
    sourceLang: string | null;
    targetLang: string;
    extendedTargetLangs: string[];
    infoLanguage: string | null;
    ttsVoices: Record<string, string>;
    hasCompletedLanguageSetup: boolean;
    updatedAt: number;
}

export class EasyTranslatorDB extends Dexie {
    conversations!: Table<Conversation>;
    settings!: Table<AppSettings>;

    constructor() {
        super('EasyTranslatorDB');
        this.version(1).stores({
            conversations: '++id, createdAt, sourceLang, targetLang'
        });
        this.version(2).stores({
            conversations: '++id, createdAt, sourceLang, targetLang',
            settings: '&id'
        });
    }
}

export const db = new EasyTranslatorDB();
