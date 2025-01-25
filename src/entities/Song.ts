import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Word } from './Word';

@Entity()
export class Song {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  filename: string;

  @Column('text')
  authors: string;  // Stored as comma-separated string: "author1,author2,author3"

  @Column('text')
  composers: string;  // Stored as comma-separated string: "composer1,composer2"

  @Column('text')
  singers: string;  // Stored as comma-separated string: "singer1,singer2"

  @OneToMany(() => Word, word => word.song)
  words: Word[];

  getAuthorsArray(): string[] {
    return this.authors ? this.authors.split(',').map(a => a.trim()) : [];
  }

  getComposersArray(): string[] {
    return this.composers ? this.composers.split(',').map(c => c.trim()) : [];
  }

  getSingersArray(): string[] {
    return this.singers ? this.singers.split(',').map(s => s.trim()) : [];
  }
}
