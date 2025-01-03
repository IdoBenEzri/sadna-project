import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class UniqueWord {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  text: string;

  @Column()
  songId: string;
}
