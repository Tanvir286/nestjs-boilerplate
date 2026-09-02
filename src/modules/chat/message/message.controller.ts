import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Param,
  Delete,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { OpenOrCreateConversationDto } from './dto/open-or-create-conversation.dto';
import { MessageGateway } from './message.gateway';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor, FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import appConfig from 'src/config/app.config';
import { PaginationDto } from 'src/common/pagination/pagination.dto';


@ApiBearerAuth()
@ApiTags('Message')
@UseGuards(JwtAuthGuard)
@Controller('chat/message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}


  /*------------------------------------        
        OPEN OR CREATE CONVERSATION                 
  --------------------------------------*/
  @Post('open-or-create-conversation')
  async openOrCreateConversation(
    @Body() openOrCreateConversationDto: OpenOrCreateConversationDto,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.openOrCreateConversation(
      openOrCreateConversationDto,
      user,
    );
  }

  /*------------------------------------        
           SEND MESSAGE                 
  --------------------------------------*/
  @Post('send-message')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, 
      },
    }),
  )
  async create(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: any,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const user = req.user.userId;
    console.log(`User ID: ${user}`);
    return this.messageService.create_message(createMessageDto, user, files);
  }

  
  /*------------------------------------        
     GET ALL MESSAGE FOR A CONVERSATION                 
  --------------------------------------*/

  @Get('all-message/:conversationId')
  async findAll(
    @Param('conversationId') conversationId: string,
    @Query() paginationdto: PaginationDto,
    @Req() req: any,
  ) {
    const user = req.user.userId;
   return this.messageService.findAll(conversationId, user, paginationdto);
  }
 
  /*------------------------------------        
     DELETE MESSAGE                 
  --------------------------------------*/

  @Delete('delete-message/:messageId')
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.deleteMessage(user, messageId);
  }
  

  /*------------------------------------        
        Unread Messages Count (Unseen)                 
  --------------------------------------*/

  @Get('unread-messages-count/:conversationId')
  async unreadMessagesCount(
    @Param('conversationId') conversationId: string,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.unreadMessagesCount(conversationId, user);
  }

  /*-------------------------------------
         Unread Messages List (Unseen)
  --------------------------------------*/

  @Get('unread-messages-list/:conversationId')
  async unreadMessagesList(
    @Param('conversationId') conversationId: string,
    @Query() paginationdto: PaginationDto,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.unreadMessagesList(
      conversationId,
      user,
      paginationdto,
    );
  }

  /*------------------------------------        
       Read Messages List (Seen)                 
  --------------------------------------*/

  @Get('read-messages-list/:conversationId')
  async readMessagesList(
    @Param('conversationId') conversationId: string,
    @Query() paginationdto: PaginationDto,
    @Req() req: any,
  ) {
    const user = req.user.userId;
    return this.messageService.readMessagesList(
      conversationId,
      user,
      paginationdto,
    );
  }

  /*------------------------------------        
       Mark as Read (Seen)                 
  --------------------------------------*/

  @Post('mark-as-read/:messageId')
  async markAsRead(@Param('messageId') messageId: string, @Req() req: any) {
    const user = req.user.userId;
    return this.messageService.markAsRead(user, messageId);
  }
}

