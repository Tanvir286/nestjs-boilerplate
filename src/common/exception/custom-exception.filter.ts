import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';

@Catch(HttpException)
export class CustomExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();

    let message = 'An error occurred';
    let additionalData = {};

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const { message: resMessage, statusCode, error, ...rest } = exceptionResponse as any;
      message = resMessage || message;
      additionalData = rest;
    }

    response.status(status).json({
      success: false,
      ...additionalData,
      message,
    });
  }
}




