import { Repository } from 'typeorm';
import { Song, Word, UniqueWord, GroupOfWords, Expression } from './entities';
export declare class AppService {
    private readonly songRepository;
    private readonly wordRepository;
    private readonly uniqueWordRepository;
    private readonly groupOfWordsRepository;
    private readonly expressionRepository;
    constructor(songRepository: Repository<Song>, wordRepository: Repository<Word>, uniqueWordRepository: Repository<UniqueWord>, groupOfWordsRepository: Repository<GroupOfWords>, expressionRepository: Repository<Expression>);
    uploadSong({ filename, data, name, authors, composers, singers }: any): Promise<string>;
    getWords(query: {
        rowIndex?: number;
        inlineIndex?: number;
        paragraphIndex?: number;
        song_ids?: string;
    }): Promise<any[]>;
    getWordContext(word: string): Promise<any[]>;
    createGroupOfWords(name: string, words: string[]): Promise<void>;
    getGroups(): Promise<string[]>;
    getGroupIndexes(groupId: string): Promise<any>;
    addExpression(expression: string): Promise<void>;
    searchExpression(expression: string, songId: string): Promise<any[]>;
    getStatistics(): Promise<any>;
    getWordOccurrences(): Promise<any[]>;
    private getContext;
}
