import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SettingEntity } from '../../core/entities/setting.entity';
import { UpsertSettingRequestDto } from '../dtos';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingRepository: Repository<SettingEntity>,
  ) {}

  async findAll(): Promise<SettingEntity[]> {
    return this.settingRepository.find({
      order: { key: 'ASC' },
    });
  }

  async findOne(key: string): Promise<SettingEntity> {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    return setting;
  }

  async upsert(dto: UpsertSettingRequestDto): Promise<SettingEntity> {
    const existing = await this.settingRepository.findOne({
      where: { key: dto.key },
    });

    if (existing) {
      existing.value = dto.value;
      return this.settingRepository.save(existing);
    }

    const setting = this.settingRepository.create({
      key: dto.key,
      value: dto.value,
    });
    return this.settingRepository.save(setting);
  }

  async remove(key: string): Promise<void> {
    const setting = await this.findOne(key);
    await this.settingRepository.remove(setting);
  }
}
