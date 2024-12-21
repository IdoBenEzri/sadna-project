import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { Word } from './Word';
import { GroupOfWords } from './GroupOfWords';
import { Song } from './Song';

@Entity()
export class UniqueWord {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  text: string;

  @ManyToOne(() => Song, (song) => song.uniqueWords)
  song: Song;

  @OneToMany(() => Word, (word) => word.uniqueWord)
  words: Word[];

  @OneToMany(() => GroupOfWords, (groupOfWords) => groupOfWords.uniqueWord)
  groupAssociations: GroupOfWords[];
}
