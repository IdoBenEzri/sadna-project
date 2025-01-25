import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Word } from './Word';

@Entity()
export class Song {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  filename: string;

  @Column('text', { array: true, nullable: false, default: [] })
  authors: string[];

  @Column('text', { array: true, nullable: false, default: [] })
  composers: string[];

  @Column('text', { array: true, nullable: false, default: [] })
  singers: string[];

  @OneToMany(() => Word, word => word.song, {
    cascade: true,
    onDelete: 'CASCADE'
  })
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
