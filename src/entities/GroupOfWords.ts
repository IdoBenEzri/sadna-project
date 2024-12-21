import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UniqueWord } from './UniqueWord';

@Entity()
export class GroupOfWords {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  groupId: string;

  @ManyToOne(() => UniqueWord, (uniqueWord) => uniqueWord.groupAssociations)
  uniqueWord: UniqueWord;

  @Column()
  name: string;
}
