import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Word {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  songId: string;

  @Column()
  rowIndex: number;

  @Column()
  paragraphIndex: number;

  @Column()
  inRowIndex: number;

  @Column()
  text: string;

  @Column()
  uniqueWordId: string;
}
