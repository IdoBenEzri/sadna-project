import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Song } from './Song';
import { UniqueWord } from './UniqueWord';

@Entity()
export class Word {
  @PrimaryGeneratedColumn()
  id: string;

  @ManyToOne(() => Song)
  @JoinColumn()
  song: Song;

  @Column()
  rowIndex: number;

  @Column()
  paragraphIndex: number;

  @Column()
  inRowIndex: number;

  @Column()
  text: string;

  @ManyToOne(() => UniqueWord, (uniqueWord) => uniqueWord.words)
  uniqueWord: UniqueWord;
}
