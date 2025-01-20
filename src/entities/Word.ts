import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Song } from './Song';
import { UniqueWord } from './UniqueWord';

@Entity('word')
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  text: string;

  @Column()
  rowIndex: number;

  @Column()
  paragraphIndex: number;

  @Column()
  inRowIndex: number;

  @ManyToOne(() => Song, song => song.words)
  song: Song;

  @ManyToOne(() => UniqueWord)
  uniqueWord: UniqueWord;
}
