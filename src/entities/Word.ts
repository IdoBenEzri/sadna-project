import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Word {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ name: 'songid' })
  songId: string;

  @Column({ name: 'rowindex' })
  rowIndex: number;

  @Column({ name: 'paragraphindex' })
  paragraphIndex: number;

  @Column({ name: 'inrowindex' })
  inRowIndex: number;

  @Column({ name: 'text' })
  text: string;

  @Column({ name: 'uniquewordid' })
  uniqueWordId: string;
}
