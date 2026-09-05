import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min, MaxLength, MinLength } from 'class-validator';

export class CreateServiceDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(0)
  baseUnitCostCents: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

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
  baseUnitCostCents?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
