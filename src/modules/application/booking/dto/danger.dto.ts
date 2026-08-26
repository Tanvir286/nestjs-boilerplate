import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';


export class DangerDto {

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  lat: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  lng: number;

}

