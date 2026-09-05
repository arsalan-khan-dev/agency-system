import { ArrayMinSize, IsArray, IsInt, IsString, IsUUID, Min, MaxLength, MinLength } from 'class-validator';

export class CreateEstimateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsUUID()
  projectTypeId: string;

  @IsUUID()
  pricingProfileId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  featureIds: string[];

  @IsString()
  @MinLength(1)
  complexityKey: string;

  @IsString()
  @MinLength(1)
  urgencyKey: string;
}

export class AdjustEstimatePriceDto {
  @IsInt()
  @Min(0)
  manualAdjustedPriceCents: number;

  @IsString()
  @MinLength(10, { message: 'Justification must be at least 10 characters — explain the reason for this adjustment' })
  justification: string;
}
