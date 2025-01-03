import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Expression {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  text: string;
  @Column({ name: 'songid' })
  uniqueWordId: string;
}
