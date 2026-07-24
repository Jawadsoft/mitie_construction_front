import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';

export const GAZZ_SQFT = 9;
export const PAKISTAN_MARLA_SQFT = 272.25;

export type MeasurementStandard = 'PAKISTAN' | 'CUSTOM';

export interface MeasurementSettings {
  standard: MeasurementStandard;
  marla_sqft: number;
  gazz_sqft: number;
}

const KEY_STANDARD = 'measurement.standard';
const KEY_MARLA_SQFT = 'measurement.marla_sqft';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingsRepo: Repository<AppSetting>,
  ) {}

  private async getRaw(key: string): Promise<unknown | undefined> {
    const row = await this.settingsRepo.findOne({ where: { key } });
    return row?.value;
  }

  private async setRaw(key: string, value: unknown) {
    await this.settingsRepo.save({ key, value });
  }

  async getMeasurement(): Promise<MeasurementSettings> {
    const standardRaw = await this.getRaw(KEY_STANDARD);
    const marlaRaw = await this.getRaw(KEY_MARLA_SQFT);

    let standard: MeasurementStandard =
      standardRaw === 'CUSTOM' || standardRaw === 'PAKISTAN'
        ? standardRaw
        : 'PAKISTAN';

    let marla_sqft =
      typeof marlaRaw === 'number' && marlaRaw > 0
        ? marlaRaw
        : typeof marlaRaw === 'string' && Number(marlaRaw) > 0
          ? Number(marlaRaw)
          : PAKISTAN_MARLA_SQFT;

    if (standard === 'PAKISTAN') {
      marla_sqft = PAKISTAN_MARLA_SQFT;
    }

    return {
      standard,
      marla_sqft,
      gazz_sqft: GAZZ_SQFT,
    };
  }

  async updateMeasurement(body: {
    standard?: MeasurementStandard;
    marla_sqft?: number;
  }): Promise<MeasurementSettings> {
    const current = await this.getMeasurement();
    const standard = body.standard ?? current.standard;

    if (standard !== 'PAKISTAN' && standard !== 'CUSTOM') {
      throw new BadRequestException('standard must be PAKISTAN or CUSTOM');
    }

    let marla_sqft: number;
    if (standard === 'PAKISTAN') {
      marla_sqft = PAKISTAN_MARLA_SQFT;
    } else {
      const raw = body.marla_sqft ?? current.marla_sqft;
      marla_sqft = Number(raw);
      if (!Number.isFinite(marla_sqft) || marla_sqft <= 0) {
        throw new BadRequestException('marla_sqft must be a positive number for CUSTOM standard');
      }
    }

    await this.setRaw(KEY_STANDARD, standard);
    await this.setRaw(KEY_MARLA_SQFT, marla_sqft);

    return {
      standard,
      marla_sqft,
      gazz_sqft: GAZZ_SQFT,
    };
  }
}
