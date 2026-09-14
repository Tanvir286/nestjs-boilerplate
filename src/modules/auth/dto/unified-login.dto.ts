import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class UnifiedLoginDto {
  @ApiProperty({
    example: 'admin@gmail.com',
    description: 'Registered email address (ADMIN or USER)',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'Admin@123',
    description: 'Account password (min 6 characters)',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiPropertyOptional({
    example: 'fcm_token_example_123',
    description: 'Firebase Cloud Messaging token (optional, for push notifications)',
  })
  @IsOptional()
  @IsString()
  fcm_token?: string;

  @ApiPropertyOptional({
    example: 'android',
    enum: ['android', 'ios', 'web'],
    description: 'Device type (optional)',
  })
  @IsOptional()
  @IsString()
  device_type?: string;
}