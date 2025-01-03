import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('uniqueword')
export class UniqueWord {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  text: string;

  @Column({ name: 'songid' })
  songId: string;
}
