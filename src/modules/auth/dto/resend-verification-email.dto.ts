import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerificationEmailDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address to resend the verification link to',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}