import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { LocalAuthGuard } from 'src/modules/auth/guards/local-auth.guard';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { FirebaseAuthDto } from './dto/firebase-auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /*------------------------------------
               USER DETAILS              
---------------------------------------*/
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.me(user_id);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch user details',
      };
    }
  }

  /*------------------------------------
           USER REGISTER               
---------------------------------------*/

  @Post('register')
  async create(@Body() data: CreateUserDto) {
    try {
      const first_name = data.first_name;
      const last_name = data.last_name;
      const name = first_name + ' ' + last_name;
      const email = data.email;
      const address = data.address;
      const password = data.password;
      const type = data.type;

      if (!first_name) {
        throw new HttpException('Name not provided', HttpStatus.UNAUTHORIZED);
      }

      if (!last_name) {
        throw new HttpException('Name not provided', HttpStatus.UNAUTHORIZED);
      }

      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!address) {
        throw new HttpException(
          'Address not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const response = await this.authService.register({
        first_name: first_name,
        last_name: last_name,
        name: name,
        address: address,
        email: email,
        password: password,
        type: type,
      });

      return response;
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------
               VERIFY EMAIL               
---------------------------------------*/

  @Post('verify-email')
  async verifyEmail(@Body() data: VerifyEmailDto) {
    try {
      const email = data.email;
      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyEmail({
        email: email,
        token: token,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to verify email',
      };
    }
  }

  /*------------------------------------
      Resend Email  Verification               
---------------------------------------*/

  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendVerificationEmail(email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to resend verification email',
      };
    }
  }

  /*------------------------------------
               USER LOGIN               
---------------------------------------*/
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @Req() req: Request,
    @Res() res: Response,
    @Body() data: { fcm_token?: string; device_type?: string },
  ) {
    try {
      const user_id = req.user.id;
      const user_email = req.user.email;

      const response = await this.authService.login({
        userId: user_id,
        email: user_email,
        fcm_token: data?.fcm_token,
        device_type: data?.device_type,
      });

      // store to secure cookies
      res.cookie('refresh_token', response.authorization.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      res.json(response);
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------
               USER UPDATE               
---------------------------------------*/
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.updateUser(user_id, data, image);
      return response;
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to update user',
      };
    }
  }

  /*------------------------------------
               FORGOT PASSWORD               
---------------------------------------*/

  @Post('forgot-password')
  async forgotPassword(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.forgotPassword(email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  /*------------------------------------
         Reset PASSWORD                
---------------------------------------*/
  @Post('reset-password')
  async resetPassword(
    @Body() data: { email: string; token: string; password: string },
  ) {
    try {
      const email = data.email;
      const token = data.token;
      const password = data.password;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!password) {
        throw new HttpException(
          'Password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.resetPassword({
        email: email,
        token: token,
        password: password,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  /*------------------------------------        
               RESEND TOKEN              
---------------------------------------*/
  @Post('resend-token')
  async resendToken(@Body() data: { email: string }) {
    try {
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.resendToken(email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to resend password reset token',
      };
    }
  }

  /*------------------------------------
         Verify Token              
---------------------------------------*/
  @Post('verify-token')
  async verifyToken(@Body() data: { email: string; token: string }) {
    try {
      const email = data.email;
      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.verifyToken({
        email: email,
        token: token,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to verify token',
      };
    }
  }

  /*------------------------------------        
               CHANGE PASSWORD              
---------------------------------------*/
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() data: { email: string; old_password: string; new_password: string },
  ) {
    try {
      // const email = data.email;
      const user_id = req.user.userId;

      const oldPassword = data.old_password;
      const newPassword = data.new_password;
      // if (!email) {
      //   throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      // }
      if (!oldPassword) {
        throw new HttpException(
          'Old password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      if (!newPassword) {
        throw new HttpException(
          'New password not provided',
          HttpStatus.UNAUTHORIZED,
        );
      }
      return await this.authService.changePassword({
        // email: email,
        user_id: user_id,
        oldPassword: oldPassword,
        newPassword: newPassword,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to change password',
      };
    }
  }

  /*------------------------------------        
        REQUEST  EMAIL  CHANGE             
---------------------------------------*/

  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  async requestEmailChange(
    @Req() req: Request,
    @Body() data: { email: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.requestEmailChange(user_id, email);
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  /*------------------------------------        
               CHANGE EMAIL              
---------------------------------------*/

  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(
    @Req() req: Request,
    @Body() data: { email: string; token: string },
  ) {
    try {
      const user_id = req.user.userId;
      const email = data.email;

      const token = data.token;
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
      }
      if (!token) {
        throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
      }
      return await this.authService.changeEmail({
        user_id: user_id,
        new_email: email,
        token: token,
      });
    } catch (error: any) {
      return {
        success: false,
        message: 'Something went wrong',
      };
    }
  }

  /*------------------------------------        
     FIREBASE GOOGLE AUTHENTICATION              
---------------------------------------*/

  @ApiOperation({ summary: 'Firebase Google Authentication' })
  @Post('firebase/google')
  async firebaseGoogleAuth(@Body() firebaseAuthDto: FirebaseAuthDto) {
    try {
      const { idToken, fcm_token } = firebaseAuthDto;

      if (!idToken) {
        throw new HttpException(
          'ID Token not provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.firebaseGoogleAuth(
        idToken,
        fcm_token,
      );

      const isNew =
        result && typeof result === 'object'
          ? !!(
              (result as any).is_new_user ??
              (result as any).isNewUser ??
              (result as any).new_user ??
              false
            )
          : false;

      if (result && typeof result === 'object') {
        return { ...(result as object), is_new_user: isNew };
      }

      return { success: true, data: result, is_new_user: isNew };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------        
     FIREBASE APPLE AUTHENTICATION              
---------------------------------------*/

  @ApiOperation({ summary: 'Firebase Apple Authentication' })
  @Post('firebase/apple')
  async firebaseAppleAuth(@Body() firebaseAuthDto: FirebaseAuthDto) {
    try {
      const { idToken, fcm_token } = firebaseAuthDto;

      if (!idToken) {
        throw new HttpException(
          'ID Token not provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.authService.firebaseAppleAuth(
        idToken,
        fcm_token,
      );

      const isNew =
        result && typeof result === 'object'
          ? !!(
              (result as any).is_new_user ??
              (result as any).isNewUser ??
              (result as any).new_user ??
              false
            )
          : false;

      if (result && typeof result === 'object') {
        return { ...(result as object), is_new_user: isNew };
      }

      return { success: true, data: result, is_new_user: isNew };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
