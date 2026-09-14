import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const body = request?.body ?? {};
    const email = body?.email;
    const password = body?.password;

    if (err || !user) {
      
      if (!email) {
        throw new HttpException('Email not provided', HttpStatus.BAD_REQUEST);
      }
      if (!password) {
        throw new HttpException('Password not provided', HttpStatus.BAD_REQUEST);
      }

      // Wrong credentials → 401 Unauthorized
      throw err || new UnauthorizedException('Invalid email or password');
    }

    return user;
  }
}