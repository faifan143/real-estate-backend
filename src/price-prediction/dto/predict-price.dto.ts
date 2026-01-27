import { IsString, IsNumber, IsOptional, IsIn, IsArray } from "class-validator";

export class PredictPriceDto {
  @IsOptional()
  @IsNumber()
  propertyId?: number;

  @IsString()
  @IsIn(["HOUSE", "APARTMENT"])
  type: string;

  @IsString()
  location: string;

  @IsNumber()
  area: number;

  @IsNumber()
  rooms: number;

  @IsOptional()
  @IsNumber()
  floor?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageBase64?: string[];
}
