import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
@Entity()
export class Song {
  @PrimaryGeneratedColumn()
  id: string;

  @Column()
  filename: string;

  @Column()
  name: string;

  @Column()
  author: string;

  @Column('simple-array')
  composers: string[]; // Stores as a comma-separated string

  @Column('simple-array')
  singers: string[]; // Stores as a comma-separated string
}
