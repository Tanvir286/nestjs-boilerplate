import { PaginationDto } from 'src/common/pagination';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAvailableMaidsDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Latitude of the homeowner (optional, falls back to DB if omitted)',
    example: 23.8103,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude of the homeowner (optional, falls back to DB if omitted)',
    example: 90.4125,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

    


}
