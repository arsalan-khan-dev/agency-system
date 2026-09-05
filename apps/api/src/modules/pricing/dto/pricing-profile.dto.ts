import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';

// Phase 2 task 4 — full multi-currency, no conversion. Small, deliberate
// allow-list rather than accepting any string: keeps display formatting
// (money.ts) and the public quotation view predictable.
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;

export class CreatePricingProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  baseHourlyRateCents: number;

  @IsInt()
  @Min(0)
  minimumPriceCents: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;
}

export class UpdatePricingProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  baseHourlyRateCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumPriceCents?: number;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
