import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class GroupOfWords {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ name: 'groupid' })
  groupId: string;

  @Column({ name: 'songid' })
  uniqueWordId: string;

  @Column()
  name: string;
}
