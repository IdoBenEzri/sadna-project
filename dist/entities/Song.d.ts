import { Word } from './Word';
import { UniqueWord } from './UniqueWord';
export declare class Song {
    id: string;
    filename: string;
    name: string;
    author: string;
    composers: string[];
    singers: string[];
    words: Word[];
    uniqueWords: UniqueWord[];
}
