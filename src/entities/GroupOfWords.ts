import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class GroupOfWords {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  groupId: string;

  @Column()
  uniqueWordId: string;

  @Column()
  name: string;
}
