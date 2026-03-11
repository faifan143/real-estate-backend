import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  area?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  rooms?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  floor?: number;
}
