import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ORG_SETTINGS_SINGLETON_ID, OrgSettings } from './entities/org-settings.entity';
import { UpdateOrgSettingsDto } from './dto/org-settings.dto';
import { AuditLogService } from '../identity/audit-log.service';

// Sensible out-of-the-box defaults so a fresh install has a coherent
// quotation PDF/header even before anyone visits the settings page — not
// placeholder junk that would look broken if never touched.
const DEFAULTS: Omit<OrgSettings, 'id' | 'updatedAt'> = {
  name: 'Your Agency',
  logoUrl: null,
  addressLine1: null,
  addressLine2: null,
  contactEmail: null,
  contactPhone: null,
  defaultCurrency: 'USD',
  quotationFooterText: null,
};

@Injectable()
export class OrgSettingsService {
  constructor(
    @InjectRepository(OrgSettings) private orgSettingsRepo: Repository<OrgSettings>,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Returns the singleton settings row, creating it with defaults on first
   * access (lazy seed, not a migration data-seed — keeps the migration
   * schema-only, consistent with this project's migration conventions
   * elsewhere, e.g. BillingReminders being schema-only too).
   */
  async get(): Promise<OrgSettings> {
    let settings = await this.orgSettingsRepo.findOne({ where: { id: ORG_SETTINGS_SINGLETON_ID } });
    if (!settings) {
      settings = await this.orgSettingsRepo.save(
        this.orgSettingsRepo.create({ id: ORG_SETTINGS_SINGLETON_ID, ...DEFAULTS }),
      );
    }
    return settings;
  }

  async update(dto: UpdateOrgSettingsDto, actingUserId: string | null): Promise<OrgSettings> {
    const settings = await this.get();

    if (dto.name !== undefined) settings.name = dto.name;
    if (dto.logoUrl !== undefined) settings.logoUrl = dto.logoUrl;
    if (dto.addressLine1 !== undefined) settings.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) settings.addressLine2 = dto.addressLine2;
    if (dto.contactEmail !== undefined) settings.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) settings.contactPhone = dto.contactPhone;
    if (dto.defaultCurrency !== undefined) settings.defaultCurrency = dto.defaultCurrency;
    if (dto.quotationFooterText !== undefined) settings.quotationFooterText = dto.quotationFooterText;

    const saved = await this.orgSettingsRepo.save(settings);

    await this.auditLogService.record({
      userId: actingUserId,
      action: 'org_settings.updated',
      entityType: 'OrgSettings',
      entityId: saved.id,
      metadata: { fields: Object.keys(dto) },
    });

    return saved;
  }
}
