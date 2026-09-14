import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserType } from '@prisma/client';

export class CreateUserDto {
  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Full name (auto-composed from first_name + last_name if omitted)',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  last_name: string;

  @ApiProperty({
    example: '123 Main Street, Springfield',
    description: 'Address',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Unique email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'password123',
    description: 'Password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;

  @ApiPropertyOptional({
    enum: UserType,
    example: UserType.USER,
    description: 'User type (ADMIN or USER)',
    default: UserType.USER,
  })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;
}