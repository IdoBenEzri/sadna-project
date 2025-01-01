import { AppService } from './app.service';
export declare class SongController {
    private readonly AppService;
    constructor(AppService: AppService);
    uploadSong(body: {
        filename: string;
        fileData: string;
        name: string;
        authors: string;
        composers: string;
        singers: string;
    }): Promise<{
        songId: string;
    }>;
    getWords(query: {
        rowIndex?: number;
        inlineIndex?: number;
        paragraphIndex?: number;
        song_ids?: string;
    }): Promise<any[]>;
    getWordContext(word: string): Promise<any[]>;
    createGroupOfWords(body: {
        name: string;
        words: string[];
    }): Promise<{
        message: string;
    }>;
    getGroups(): Promise<string[]>;
    getGroupIndexes(groupId: string): Promise<any>;
    addExpression(body: {
        expression: string;
    }): Promise<any>;
    searchExpression(body: {
        expression: string;
        songId: string;
    }): Promise<any[]>;
    getStatistics(): Promise<any>;
    getWordOccurrences(): Promise<any[]>;
}
