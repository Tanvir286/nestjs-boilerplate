import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';

@ApiBearerAuth()
@ApiTags('Conversation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('chat/conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  /*------------------------------------        
              CREATE CONVERSATION             
---------------------------------------*/
  @Post('create-conversation')
  async create(
    @Body() createConversationDto: CreateConversationDto,
    @Req() req,
  ) {
    const user = req.user.userId;
    console.log(user);
    return this.conversationService.create(createConversationDto, user);
  }

  /*------------------------------------        
         CONVERSATION LIST OF USER          
---------------------------------------*/
  @Get('conversation-list')
  async findAll(@Req() req) {
    const user = req.user.userId;
    return this.conversationService.findAll(user);
  }

  /*------------------------------------        
       GET SINGLE CONVERSATION BY ID        
---------------------------------------*/
  @Get('single-conversation/:id')
  async findOne(@Param('id') id: string, @Req() req) {
    const user = req.user.userId;
    return this.conversationService.findOne(id, user);
  }

  /*------------------------------------        
        DELETE CONVERSATION              
---------------------------------------*/

  @Delete('delete-conversation/:id')
  async remove(@Param('id') id: string, @Req() req) {
    const user = req.user.userId;
    return this.conversationService.remove(id, user);
  }
}
