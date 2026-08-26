import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '@prisma/client'; 

export class CleanerStatusDto {
  
  @IsNotEmpty()
  @IsIn([VerificationStatus.VERIFIED, VerificationStatus.REJECTED])
  status: VerificationStatus;

  @IsOptional()
  @IsString()
  rejected_reason?: string;


}