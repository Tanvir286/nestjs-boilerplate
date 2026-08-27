import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserType } from '@prisma/client';
import * as QRCode from 'qrcode';
import * as speakeasy from 'speakeasy';
import appConfig from '../../../config/app.config';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '../../guard/role/role.enum';
import { ArrayHelper } from '../../helper/array.helper';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}
  /**
   * get user by email
   * @param email
   * @returns
   */
  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user;
  }

  // email varification
  async verifyEmail({ email }) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user;
  }

  /**
   * get user details
   * @returns
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        type: true,
        status: true,
        emailVerifiedAt: true,
      },
    });
    return user;
  }

  /**
   * Check existance
   * @returns
   */
  async exist({ field, value }) {
    const model = await this.prisma.user.findFirst({
      where: {
        [field]: value,
      },
    });
    return model;
  }

  /**
   * Create su admin user
   * @param param0
   * @returns
   */
  async createSuAdminUser({ username, email, password }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);

      const user = await this.prisma.user.create({
        data: {
          name: username,
          email: email,
          password: password,
          type: UserType.ADMIN,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

 



 
  /**
   * create user under a tenant
   * @param param0
   * @returns
   */
  async createUser({
    first_name,
    last_name,
    address,
    name,
    email,
    password,
    type,
    role_id,
  }: {
    name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    address?: string;
    password: string;
    phone_number?: string;
    role_id?: string;
    type?: string;
  }) {
    try {
      const data = {};

      if (name) {
        data['name'] = name;
      }

      if (email) {
        const userEmailExist = await this.exist({
          field: 'email',
          value: String(email),
        });

        if (userEmailExist) {
          return {
            success: false,
            message: 'Email already exist',
          };
        }

        data['email'] = email;
      }

      if (password) {
        data['password'] = await bcrypt.hash(
          password,
          appConfig().security.salt,
        );
      }

      if (type && ArrayHelper.inArray(type, Object.values(Role))) {
        data['type'] = type;
      }

      if (first_name) {
        data['first_name'] = first_name;
      }

      if (last_name) {
        data['last_name'] = last_name;
      }

      if (address) {
        data['address'] = address;
      }

      const user = await this.prisma.user.create({
        data: {
          ...data,
        },
      });

      if (user) {
        // role_id logic removed since roles are handled by the 'type' field
        return {
          success: true,
          message: 'User created successfully',
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User creation failed',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * create user under a tenant
   * @param param0
   * @returns
   */
  async updateUser(
    user_id: string,
    {
      name,
      email,
      password,
      role_id = null,
      type = 'user',
    }: {
      name?: string;
      email?: string;
      password?: string;
      role_id?: string;
      type?: string;
    },
  ) {
    try {
      const data = {};
      if (name) {
        data['name'] = name;
      }
      if (email) {
        // Check if email already exist
        const userEmailExist = await this.exist({
          field: 'email',
          value: String(email),
        });

        if (userEmailExist) {
          return {
            success: false,
            message: 'Email already exist',
          };
        }
        data['email'] = email;
      }
      if (password) {
        data['password'] = await bcrypt.hash(
          password,
          appConfig().security.salt,
        );
      }

      if (ArrayHelper.inArray(type, Object.values(Role))) {
        data['type'] = type;
      } else {
        return {
          success: false,
          message: 'Invalid user type',
        };
      }

      const existUser = await this.prisma.user.findFirst({
        where: {
          id: user_id,
        },
      });

      if (!existUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const user = await this.prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          ...data,
        },
      });

      if (user) {
        // role_id logic removed since roles are handled by the 'type' field
        return {
          success: true,
          message: 'User updated successfully',
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User update failed',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * delete user
   * @param param0
   * @returns
   */
  async deleteUser(user_id: string) {
    try {
      // check if user exist
      const existUser = await this.prisma.user.findFirst({
        where: {
          id: user_id,
        },
      });
      if (!existUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await this.prisma.user.delete({
        where: {
          id: user_id,
        },
      });
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // change password
  async changePassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);
      const user = await this.prisma.user.update({
        where: {
          email: email,
        },
        data: {
          password: password,
        },
      });
      return user;
    } catch (error: any) {
      throw error;
    }
  }

  // change email
  async changeEmail({
    user_id,
    new_email,
  }: {
    user_id: string;
    new_email: string;
  }) {
    try {
      const user = await this.prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          email: new_email,
        },
      });
      return user;
    } catch (error: any) {
      throw error;
    }
  }

  // validate password
  async validatePassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    if (user) {
      const isValid = await bcrypt.compare(password, user.password);
      return isValid;
    } else {
      return false;
    }
  }

  // convert user type to admin/vendor
  async convertTo(user_id: string, type: string = 'vendor') {
    try {
      const userDetails = await this.getUserDetails(user_id);
      if (!userDetails) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      if (userDetails.type == UserType.HOMEOWNER) {
        return {
          success: false,
          message: 'User is already a homeowner',
        };
      }
      await this.prisma.user.update({
        where: { id: user_id },
        data: { type: type as UserType },
      });

      return {
        success: true,
        message: 'Converted to ' + type + ' successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  

 

  

  
  
  // get user information
  async getUserInfo(user_id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: {
        id: true,
        name: true,
        email: true,
        type: true,
        country: true,
        state: true,
        city: true,
        zipCode: true,
        address: true,
      },
    });
    return user;
  }

  // get admin users
  async getAdminUser() {
    const users = await this.prisma.user.findFirst({
      where: {
        type: UserType.ADMIN,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    return users;
  }
}
