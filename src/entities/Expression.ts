import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UniqueWord } from './UniqueWord';

@Entity()
export class Expression {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  text: string;

  @ManyToOne(() => UniqueWord, (uniqueWord) => uniqueWord.id)
  uniqueWord: UniqueWord;
}
