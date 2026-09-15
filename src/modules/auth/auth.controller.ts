import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
import { SWAGGER_AUTH } from 'src/common/swagger/swagger-auth';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { UnifiedLoginDto } from './dto/unified-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendTokenDto } from './dto/resend-token.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /*------------------------------------
               USER DETAILS              
---------------------------------------*/
  @ApiBearerAuth(SWAGGER_AUTH.USER)
  @ApiOperation({
    summary: 'Get current user details ❤️',
    description: 'Returns the profile of the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
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
  @ApiOperation({
    summary: 'Register a new user ❤️️',
    description: 'Creates a new account. `type` should be `ADMIN` or `USER`.',
  })
  @ApiBody({
    type: CreateUserDto,
    examples: {
      admin: {
        summary: 'Register as Admin',
        value: {
          first_name: 'System',
          last_name: 'Admin',
          address: '1 Admin HQ',
          email: 'admin@gmail.com',
          password: '12345678',
          type: 'ADMIN',
        },
      },
      user: {
        summary: 'Register as User',
        value: {
          first_name: 'John',
          last_name: 'Doe',
          address: '123 Main Street',
          email: 'user@gmail.com',
          password: '12345678',
          type: 'USER',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
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

  @ApiOperation({
    summary: 'Verify email address ❤️',
    description: 'Confirms the email using the token sent during registration.',
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
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

  @ApiOperation({ summary: 'Resend verification email ❤️' })
  @ApiBody({ type: ResendVerificationEmailDto })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
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
  @ApiOperation({
    summary: 'Unified Login (Admin & User) ❤️',
    description: `Authenticate as either **Admin** or **User**.
**Swagger auto-auth:**
After a successful login, the returned token is stored under the correct Swagger auth
scheme (\`admin-token\` or \`user-token\`). Each token persists independently.

**Test Credentials:**

| Role  | Email             | Password   |
|-------|-------------------|------------|
| ADMIN | admin@gmail.com   | 123456     |
| USER  | user1@gmail.com   | 123456     |`,
  })
  @ApiBody({
    type: UnifiedLoginDto,
    examples: {
      admin: {
        summary: 'Admin Login',
        description: 'Role: ADMIN',
        value: {
          email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
          password: process.env.ADMIN_PASSWORD || '12345678',
        },
      },
      user: {
        summary: 'User Login',
        description: 'Role: USER',
        value: {
          email: process.env.USER_EMAIL || 'user1@gmail.com',
          password: process.env.USER_PASSWORD || '12345678',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 400, description: 'Email or password missing' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Req() req: Request,
    @Res() res: Response,
    @Body() data: UnifiedLoginDto,
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
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
  @ApiBearerAuth(SWAGGER_AUTH.USER)
  @ApiOperation({
    summary: 'Update current user profile  ❤️',
    description:
      "Updates the authenticated user's profile. Supports multipart/form-data with an optional `image` file (max 50MB).",
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        first_name: { type: 'string', example: 'John' },
        last_name: { type: 'string', example: 'Doe' },
        name: { type: 'string', example: 'John Doe' },
        address: { type: 'string', example: '123 Main Street, Springfield' },
        type: { type: 'string', enum: ['ADMIN', 'USER'], example: 'USER' },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Profile image (max 50MB)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({
    summary: 'Request password reset ❤️',
    description:
      'Sends a password reset token to the provided email if the account exists.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 201,
    description: 'Password reset token sent (if account exists)',
  })
  @ApiResponse({ status: 400, description: 'Email not provided / invalid' })
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
  @ApiOperation({
    summary: 'Reset password with token ❤️',
    description:
      'Resets the account password using the token received via email.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 201, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Missing or invalid fields' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @Post('reset-password')
  async resetPassword(@Body() data: ResetPasswordDto) {
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
  @ApiOperation({
    summary: 'Resend password reset token ❤️',
    description:
      'Resends the password reset token to the provided email address.',
  })
  @ApiBody({ type: ResendTokenDto })
  @ApiResponse({ status: 201, description: 'Password reset token resent' })
  @ApiResponse({ status: 400, description: 'Email not provided' })
  @Post('resend-token')
  async resendToken(@Body() data: ResendTokenDto) {
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
  @ApiOperation({
    summary: 'Verify a token ❤️',
    description:
      'Verifies the validity of a token (email verification / password reset) for the given email.',
  })
  @ApiBody({ type: VerifyTokenDto })
  @ApiResponse({ status: 201, description: 'Token verified successfully' })
  @ApiResponse({ status: 400, description: 'Missing email or token' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  @Post('verify-token')
  async verifyToken(@Body() data: VerifyTokenDto) {
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

  @ApiBearerAuth(SWAGGER_AUTH.USER)
  @ApiOperation({
    summary: 'Change current user password',
    description:
      'Changes the password of the authenticated user. Requires the old password for verification.',
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 201, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Missing or invalid fields' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized / wrong old password',
  })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: Request, @Body() data: ChangePasswordDto) {
    try {
      const user_id = req.user.userId;

      const oldPassword = data.old_password;
      const newPassword = data.new_password;

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

  @ApiBearerAuth(SWAGGER_AUTH.USER)
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

  @ApiBearerAuth(SWAGGER_AUTH.USER)
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
