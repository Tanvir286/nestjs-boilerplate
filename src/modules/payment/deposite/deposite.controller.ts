import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DepositeService } from './deposite.service';

import { UpdateDepositDto } from './dto/update-deposite.dto';
import { CreateDepositDto } from './dto/create-deposite.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';

@ApiBearerAuth(SWAGGER_AUTH.USER)
@UseGuards(JwtAuthGuard)
@Controller('deposite')
export class DepositeController {
  constructor(private readonly depositeService: DepositeService) {}

  /*--------------------------------  
            GET MY BALANCE
  ----------------------------------*/
  @Get('balance')
  async getBalance(@Req() req: any) {
    const userId = req.user.userId;
    return this.depositeService.getBalance(userId);
  }

  /*--------------------------------  
              ADD DEPOSITE
  ----------------------------------*/
  @Post('add-balance')
  async create(@Body() createDepositDto: CreateDepositDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.depositeService.create(createDepositDto, userId);
  }
}
