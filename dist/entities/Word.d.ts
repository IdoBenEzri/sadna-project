import { Song } from './Song';
import { UniqueWord } from './UniqueWord';
export declare class Word {
    id: string;
    song: Song;
    rowIndex: number;
    paragraphIndex: number;
    inRowIndex: number;
    text: string;
    uniqueWord: UniqueWord;
}
