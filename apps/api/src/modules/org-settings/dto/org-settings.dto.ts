import { IsEmail, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { SUPPORTED_CURRENCIES } from '../../pricing/dto/pricing-profile.dto';

// No CreateDto — OrgSettings is a singleton, seeded/upserted by the service,
// never created via the API. Every field is optional here because PATCH
// semantics apply: only the fields the person actually wants to change are
// sent, the rest are left untouched.
export class UpdateOrgSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Logo URL must be a valid URL' })
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactPhone?: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  defaultCurrency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  quotationFooterText?: string;
}
