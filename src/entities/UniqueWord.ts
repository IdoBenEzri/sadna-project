import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
} from 'typeorm';
import { Word } from './Word';
import { GroupOfWords } from './GroupOfWords';

@Entity()
export class UniqueWord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, unique: true })
  text: string;

  @OneToMany(() => Word, word => word.uniqueWord)
  words: Word[];

  @OneToMany(() => GroupOfWords, (groupOfWords) => groupOfWords.uniqueWord)
  groupAssociations: GroupOfWords[];
}
