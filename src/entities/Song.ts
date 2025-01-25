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

  @Column('text', { array: true })
  authors: string[];

  @Column('text', { array: true })
  composers: string[];

  @Column('text', { array: true })
  singers: string[];

  @OneToMany(() => Word, word => word.song)
  words: Word[];

  getAuthorsArray(): string[] {
    return this.authors ? this.authors.map(a => a.trim()) : [];
  }

  getComposersArray(): string[] {
    return this.composers ? this.composers.map(c => c.trim()) : [];
  }

  getSingersArray(): string[] {
    return this.singers ? this.singers.map(s => s.trim()) : [];
  }
}
