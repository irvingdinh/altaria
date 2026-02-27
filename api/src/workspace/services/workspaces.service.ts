import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, statSync } from 'fs';
import { nanoid } from 'nanoid';
import { Repository } from 'typeorm';

import { WorkspaceEntity } from '../../core/entities/workspace.entity';
import { CreateWorkspaceRequestDto, UpdateWorkspaceRequestDto } from '../dtos';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly workspaceRepository: Repository<WorkspaceEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(): Promise<WorkspaceEntity[]> {
    return this.workspaceRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<WorkspaceEntity> {
    const workspace = await this.workspaceRepository.findOne({
      where: { id },
    });
    if (!workspace) throw new NotFoundException(`Workspace "${id}" not found`);
    return workspace;
  }

  async create(dto: CreateWorkspaceRequestDto): Promise<WorkspaceEntity> {
    this.validateDirectory(dto.directory);

    const workspace = this.workspaceRepository.create({
      id: nanoid(),
      name: dto.name,
      directory: dto.directory,
    });
    return this.workspaceRepository.save(workspace);
  }

  async update(
    id: string,
    dto: UpdateWorkspaceRequestDto,
  ): Promise<WorkspaceEntity> {
    const workspace = await this.findOne(id);

    if (dto.directory) {
      this.validateDirectory(dto.directory);
    }

    if (dto.name !== undefined) workspace.name = dto.name;
    if (dto.directory !== undefined) workspace.directory = dto.directory;

    return this.workspaceRepository.save(workspace);
  }

  async remove(id: string): Promise<void> {
    const workspace = await this.findOne(id);
    this.eventEmitter.emit('workspace.deleted', { workspaceId: id });
    await this.workspaceRepository.remove(workspace);
  }

  private validateDirectory(path: string): void {
    if (!existsSync(path)) {
      throw new BadRequestException(`Directory does not exist: ${path}`);
    }

    const stat = statSync(path);
    if (!stat.isDirectory()) {
      throw new BadRequestException(`Path is not a directory: ${path}`);
    }
  }
}
