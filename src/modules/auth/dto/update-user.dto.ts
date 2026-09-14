import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { UserType } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  last_name?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Springfield' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    enum: UserType,
    example: UserType.USER,
    description: 'User type (ADMIN or USER)',
  })
  @IsOptional()
  @Type(() => String)
  @IsEnum(UserType)
  type?: UserType;
}