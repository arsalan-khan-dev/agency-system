import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, MaxLength, MinLength } from 'class-validator';

export class CreateFeatureDto {
  @IsUUID()
  projectTypeId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baselineHours?: number;
}

export class UpdateFeatureDto {
  @IsOptional()
  @IsUUID()
  projectTypeId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baselineHours?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
