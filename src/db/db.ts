import Dexie, { type Table } from 'dexie';

export interface Conversation {
    id?: number;
    createdAt: number;
    sourceText: string;
    sourceLang: string;
    translatedText: string;
    targetLang: string;
}

export class EasyTranslatorDB extends Dexie {
    conversations!: Table<Conversation>;

    constructor() {
        super('EasyTranslatorDB');
        this.version(1).stores({
            conversations: '++id, createdAt, sourceLang, targetLang'
        });
    }
}

export const db = new EasyTranslatorDB();
