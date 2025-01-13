import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Word } from './Word';
import { UniqueWord } from './UniqueWord';

@Entity()
export class Song {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  filename: string;

  @Column()
  name: string;

  @Column('simple-array')
  authors: string[]; // Stores as a comma-separated string

  @Column('simple-array')
  composers: string[]; // Stores as a comma-separated string

  @Column('simple-array')
  singers: string[]; // Stores as a comma-separated string

  @OneToMany(() => Word, (word) => word.song)
  words: Word[];

  uniqueWords: UniqueWord[];
}
