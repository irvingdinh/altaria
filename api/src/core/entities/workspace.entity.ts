import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('workspaces')
export class WorkspaceEntity {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  directory: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
