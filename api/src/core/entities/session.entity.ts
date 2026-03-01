import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sessions')
export class SessionEntity {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'text' })
  workspaceId: string;

  @Column({ type: 'text' })
  agentType: string;

  @Column({ type: 'text', default: '[]' })
  args: string;

  @Column({ type: 'text' })
  cwd: string;

  @Column({ type: 'text' })
  tmuxSessionName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
