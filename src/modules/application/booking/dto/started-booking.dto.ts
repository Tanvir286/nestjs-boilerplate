import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

enum AllowedBookingStatus {
  STARTED = 'STARTED',
}

export class StartedBookingDto {
 
  @IsEnum(AllowedBookingStatus, {
    message: 'status must be either STARTED',
  })
  status: AllowedBookingStatus;

  @IsOptional()
  @Transform(({ value }) => {
    const date = value ? new Date(value) : new Date();
    return isNaN(date.getTime()) ? null : date;
  })
  @Type(() => Date)
  start_time: Date;

}
