import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany } from 'typeorm';
import { UniqueWord } from './UniqueWord';

@Entity()
export class Expression {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  text: string;

  @Column('text', { array: true })
  uniqueWordIds: string[];

  @ManyToMany(() => UniqueWord, (uniqueWord) => uniqueWord.id)
  uniqueWords: UniqueWord[];
}
