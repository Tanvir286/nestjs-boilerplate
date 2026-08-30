import * as admin from 'firebase-admin';
// external imports
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

//internal imports
import { DateHelper } from '../../common/helper/date.helper';
import { StringHelper } from '../../common/helper/string.helper';
import { TanvirStorage } from '../../common/lib/Disk/TanvirStorage';
import { StripePayment } from '../../common/lib/Payment/stripe/StripePayment';
import { NotificationRepository } from '../../common/repository/notification/notification.repository';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { UserRepository } from '../../common/repository/user/user.repository';
import appConfig from '../../config/app.config';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  sendAdminNotification,
  sendUserNotification,
} from 'src/common/utils/notification.util';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private userRepository: UserRepository,
    private ucodeRepository: UcodeRepository,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  private resolveAvatarUrl(avatar: string | null | undefined) {
    if (!avatar) {
      return null;
    }

    if (/^https?:\/\//i.test(avatar)) {
      return avatar;
    }

    return TanvirStorage.url(appConfig().storageUrl.avatar + '/' + avatar);
  }

  /*------------------------------------
               USER DETAILS              
---------------------------------------*/

  async me(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          address: true,
          type: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.avatar) {
        user['avatar_url'] = this.resolveAvatarUrl(user.avatar);
      }

      if (user) {
        return {
          success: true,
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------
           USER REGISTER               
---------------------------------------*/

  async register({
    first_name,
    last_name,
    name,
    address,
    email,
    password,
    type,
  }: {
    first_name: string;
    last_name: string;
    name: string;
    address: string;
    email: string;
    password: string;
    type?: string;
  }) {
    try {
      // Check if email already exist
      const userEmailExist = await this.userRepository.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        return {
          statusCode: 401,
          message: 'Email already exist',
        };
      }

      const user = await this.userRepository.createUser({
        name: name,
        email: email,
        password: password,
        first_name: first_name,
        last_name: last_name,
        address: address,
        type: type,
      });

      if (user == null && user.success == false) {
        return {
          success: false,
          message: 'Failed to create account',
        };
      }

      // create stripe customer account
      const stripeCustomer = await StripePayment.createCustomer({
        user_id: user.data.id,
        email: email,
        name: name,
      });

      if (stripeCustomer) {
        await this.prisma.user.update({
          where: {
            id: user.data.id,
          },
          data: {
            billingId: stripeCustomer.id,
          },
        });
      }

      // create otp code
      const token = await this.ucodeRepository.createToken({
        userId: user.data.id,
        isOtp: true,
        time: 2,
      });

      // send otp code to email
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: name,
        otp: token,
      });

      await sendUserNotification({
        sender_id: 'system',
        receiver_id: user.data.id,
        text: 'We have sent an OTP code to your email',
        type: 'new user registration',
        entity_id: user.data.id,
      });

      return {
        success: true,
        message: 'We have sent an OTP code to your email',
      };
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

  async verifyEmail({ email, token }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await this.ucodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              emailVerifiedAt: new Date(Date.now()),
            },
          });

          await sendUserNotification({
            sender_id: 'system',
            receiver_id: user.id,
            text: 'Your email has been verified successfully',
            type: 'email verification',
            entity_id: user.id,
          });

          return {
            success: true,
            message: 'Email verified successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------
      Resend Email  Verification               
---------------------------------------*/

  async resendVerificationEmail(email: string) {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a verification code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------
                  USER LOGIN               
---------------------------------------*/

  async login({ email, userId, fcm_token, device_type }) {
    try {
      const user = await this.userRepository.getUserDetails(userId);

      // Check email verification
      if (!user?.emailVerifiedAt) {
        return {
          success: false,
          message:
            'Please verify your email before logging in. Check your inbox for the verification code.',
          email_verified: false,
        };
      }

      const payload = { email: email, sub: userId, type: user?.type };

      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            fcmToken: fcm_token,
            deviceType: device_type ?? null,
          },
        });
      }

      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      // store refreshToken
      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        'EX',
        60 * 60 * 24 * 7, // 7 days in seconds
      );

      return {
        success: true,
        deactive: false,
        message: 'Logged in successfully',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        type: user.type,
      };
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
  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    image?: Express.Multer.File,
  ) {
    try {
      const data: any = {};

      if (updateUserDto.name !== undefined) data.name = updateUserDto.name;

      if (updateUserDto.first_name !== undefined)
        data.first_name = updateUserDto.first_name;

      if (updateUserDto.last_name !== undefined)
        data.last_name = updateUserDto.last_name;

      if (updateUserDto.address !== undefined)
        data.address = updateUserDto.address;

      if (updateUserDto.type !== undefined) data.type = updateUserDto.type;

      if (image) {
        // delete old image from storage
        const oldImage = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { avatar: true },
        });
        if (oldImage.avatar) {
          await TanvirStorage.delete(
            appConfig().storageUrl.avatar + '/' + oldImage.avatar,
          );
        }

        // upload file
        const fileName = `${StringHelper.randomString()}_${image.originalname}`;
        await TanvirStorage.put(
          appConfig().storageUrl.avatar + '/' + fileName,
          image.buffer,
        );

        data.avatar = fileName;
      }

      const user = await this.userRepository.getUserDetails(userId);
      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...data,
          },
        });

        await sendUserNotification({
          sender_id: 'system',
          receiver_id: userId,
          text: 'Your profile has been updated',
          type: 'profile update',
          entity_id: userId,
        });

        return {
          success: true,
          message: 'User updated successfully',
        };
      } else {
        return {
          success: false,

          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------
               FORGOT PASSWORD               
---------------------------------------*/

  async forgotPassword(email) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        await sendUserNotification({
          sender_id: 'system',
          receiver_id: user.id,
          text: 'We have sent an OTP code to your email',
          type: 'forgot password',
          entity_id: user.id,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------
         Reset PASSWORD                
---------------------------------------*/

  async resetPassword({ email, token, password }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await this.ucodeRepository.verifycheckToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.userRepository.changePassword({
            email: email,
            password: password,
          });

          // delete otp code
          await this.ucodeRepository.deleteToken({
            email: email,
            token: token,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------        
               RESEND TOKEN              
---------------------------------------*/

  async resendToken(email: string) {
    try {
      const user = await this.userRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          time: 2,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a token code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------        
               VERIFY TOKEN              
---------------------------------------*/

  async verifyToken({ email, token }) {
    try {
      const user = await this.userRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const result = await this.ucodeRepository.verifyToken({
          email: email,
          token: token,
        });

        // Check the actual success property, not just if object exists
        if (result && result.success) {
          return {
            success: true,
            message: result.message || 'Token verified successfully',
          };
        } else {
          return {
            success: false,
            message: result?.message || 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------        
               CHANGE PASSWORD              
---------------------------------------*/
  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await this.userRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await this.userRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid password',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------        
        REQUEST  EMAIL  CHANGE             
---------------------------------------*/

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);
      if (user) {
        const token = await this.ucodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------        
        REQUEST  EMAIL  CHANGE             
---------------------------------------*/

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await this.userRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await this.ucodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await this.userRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          // delete otp code
          await this.ucodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          return {
            success: true,
            message: 'Email updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /*------------------------------------        
              VALIDATE USER             
---------------------------------------*/
  async validateUser(
    email: string,
    pass: string,
    token?: string,
  ): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      if (user.status === 'SUSPENDED') {
        throw new UnauthorizedException({
          success: false,
          deactive: true,
          message: 'Your account is deactivated. Please contact support.',
        });
      }

      const _isValidPassword = await this.userRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        // Check if email is verified
        if (!user.emailVerifiedAt) {
          throw new UnauthorizedException(
            'Please verify your email before logging in',
          );
        }
        const { password, ...result } = user;

        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
        // return {
        //   success: false,
        //   message: 'Password not matched',
        // };
      }
    } else {
      throw new UnauthorizedException('Email not found');
      // return {
      //   success: false,
      //   message: 'Email not found',
      // };
    }
  }

  /*------------------------------------        
     FIREBASE GOOGLE AUTHENTICATION              
---------------------------------------*/
  async firebaseGoogleAuth(idToken: string, fcm_token?: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        throw new UnauthorizedException('Email not found in Firebase token');
      }

      let user = await this.prisma.user.findUnique({
        where: { email: email },
      });

      if (!user) {
        const nameParts = name ? name.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        user = await this.prisma.user.create({
          data: {
            email: email,
            firstName: firstName,
            lastName: lastName,
            avatar: picture || null,
            googleId: uid,
            emailVerifiedAt: new Date(),
            status: 'APPROVED',
            type: 'MAID',
          },
        });

        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          name: name || email,
          email: email,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { billingId: stripeCustomer.id },
          });
        }
      } else if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: uid,
            avatar: user.avatar || picture || null,
          },
        });
      }

      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { fcmToken: fcm_token },
        });
      }

      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        'EX',
        60 * 60 * 24 * 7,
      );

      const avatarUrl = this.resolveAvatarUrl(user.avatar);

      return {
        success: true,
        message: 'Logged in successfully via Firebase',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        user: {
          id: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          google_id: user.googleId,
          avatar_url: avatarUrl,
          type: user.type,
        },
      };
    } catch (error: any) {
      throw new UnauthorizedException(
        `Firebase authentication failed: ${error.message}`,
      );
    }
  }

  /*------------------------------------        
     FIREBASE APPLE AUTHENTICATION              
---------------------------------------*/
  async firebaseAppleAuth(idToken: string, fcm_token?: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;

      if (!email) {
        throw new UnauthorizedException('Email not found in Firebase token');
      }

      let user = await this.prisma.user.findUnique({ where: { email } });

      if (!user) {
        const nameParts = name ? name.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        user = await this.prisma.user.create({
          data: {
            email,
            firstName: firstName,
            lastName: lastName,
            avatar: picture || null,
            appleId: uid,
            emailVerifiedAt: new Date(),
            status: 'APPROVED',
            type: 'USER',
          },
        });

        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          name: name || email,
          email,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { billingId: stripeCustomer.id },
          });
        }
      } else if (!user.appleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            appleId: uid,
            avatar: user.avatar || picture || null,
          },
        });
      }

      if (fcm_token) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { fcmToken: fcm_token },
        });
      }

      const payload = { email: user.email, sub: user.id };
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      await this.redis.set(
        `refresh_token:${user.id}`,
        refreshToken,
        'EX',
        60 * 60 * 24 * 7,
      );

      const avatarUrl = this.resolveAvatarUrl(user.avatar);

      return {
        success: true,
        message: 'Logged in successfully via Firebase (Apple)',
        authorization: {
          type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
        },
        user: {
          id: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          google_id: user.googleId,
          avatar_url: avatarUrl,
          type: user.type,
        },
      };
    } catch (error: any) {
      throw new UnauthorizedException(
        `Firebase authentication failed: ${error.message}`,
      );
    }
  }
}
