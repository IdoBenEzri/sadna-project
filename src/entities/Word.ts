import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Song } from './Song';
import { UniqueWord } from './UniqueWord';

@Entity('word')
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  text: string;

  @Column({ nullable: false })
  rowIndex: number;

  @Column({ nullable: false })
  paragraphIndex: number;

  @Column({ nullable: false })
  inRowIndex: number;

  @ManyToOne(() => Song, song => song.words, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  song: Song;

  @ManyToOne(() => UniqueWord, {
    nullable: false,
    onDelete: 'CASCADE'
  })
  uniqueWord: UniqueWord;
}
