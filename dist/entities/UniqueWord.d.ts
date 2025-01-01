import { Word } from './Word';
import { GroupOfWords } from './GroupOfWords';
import { Song } from './Song';
export declare class UniqueWord {
    id: string;
    text: string;
    song: Song;
    words: Word[];
    groupAssociations: GroupOfWords[];
}
