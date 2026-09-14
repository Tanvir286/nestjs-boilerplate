/*-------------------------------------------
               external imports
-------------------------------------------*/
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import * as express from 'express';
import helmet from 'helmet';
import { join, resolve } from 'path';

/*-------------------------------------------
             internal imports
-------------------------------------------*/
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';

import { CustomExceptionFilter } from './common/exception/custom-exception.filter';
import { PrismaExceptionFilter } from './common/exception/prisma-exception.filter';

import { TanvirStorage } from './common/lib/Disk/TanvirStorage';

import appConfig from './config/app.config';
import initializeFirebase from './config/firebase.config';
import { getPaymentSuccessHtml } from './common/utils/payment-success.util';
import { getPaymentFailedHtml } from './common/utils/payment-failed.util';

/*-------------------------------------------
             bootstrap function
-------------------------------------------*/

async function bootstrap() {
  // ----------------------------------------------------------
  // Initialize Firebase Admin SDK
  // ----------------------------------------------------------
  // Firebase is initialized before creating the NestJS app.
  // This ensures Firebase Admin is ready when any service
  // needs to use authentication, FCM, or other Firebase features.
  // initialize Firebase Admin SDK early so `admin` is ready for services
  initializeFirebase();

  // ----------------------------------------------------------
  // Create NestJS Application
  // ----------------------------------------------------------
  // rawBody: true keeps the original request body available.
  // This can be useful for services such as Stripe webhook
  // signature verification.

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // ----------------------------------------------------------
  // Configure WebSocket Adapter
  // ----------------------------------------------------------
  // Socket.IO is used for real-time communication such as
  // chat, notifications, live updates, etc.
  app.useWebSocketAdapter(new IoAdapter(app));

  // ----------------------------------------------------------
  // Global API Prefix
  // ----------------------------------------------------------
  // All NestJS API routes will start with /api.
  //
  // Example:
  // GET /users
  // becomes:
  // GET /api/users
  app.setGlobalPrefix('api');

  // ----------------------------------------------------------
  // Enable CORS
  // ----------------------------------------------------------
  // Allows the frontend or other clients from different
  // origins/domains to communicate with this backend.
  app.enableCors();

  // ----------------------------------------------------------
  // Enable Helmet
  // ----------------------------------------------------------
  // Helmet adds several HTTP security headers to help
  // protect the application from common web vulnerabilities.
  app.use(helmet());

  // ----------------------------------------------------------
  // Configure JSON Body Size Limit
  // ----------------------------------------------------------
  // Allows JSON requests up to 50 MB.
  // This should match the maximum file/request size
  // expected by the application.
  app.use(
    express.json({
      limit: '50mb',
    }),
  );

  // ----------------------------------------------------------
  // Configure URL-Encoded Body Size Limit
  // ----------------------------------------------------------
  // Allows URL-encoded requests up to 50 MB.
  //
  // extended: true allows rich/nested objects to be parsed.
  app.use(
    express.urlencoded({
      limit: '50mb',
      extended: true,
    }),
  );

  // ----------------------------------------------------------
  // Serve Static Files
  // ----------------------------------------------------------
  // Files inside the "public" directory will be publicly
  // accessible through the /public URL prefix.
  //
  // Example:
  // public/image.jpg
  // becomes:
  // /public/image.jpg
  //
  // index: false prevents directory index pages from being
  // automatically displayed.
  app.useStaticAssets(join(__dirname, '..', '..', 'public'), {
    index: false,
    prefix: '/public',
  });

  // ==========================================================
  // Global Validation Pipe
  // ==========================================================
  app.useGlobalPipes(
    new ValidationPipe({
      // Automatically transform incoming request values
      // according to DTO types.
      transform: true,

      // Removes properties that are not defined in the DTO.
      // Helps keep request data clean and controlled.
      whitelist: true,

      // If true, unexpected properties would throw an error.
      // Currently disabled.
      forbidNonWhitelisted: false,

      // Allows automatic type conversion based on DTO metadata.
      //
      // Example:
      // "25" -> 25
      transformOptions: {
        enableImplicitConversion: true,
      },

      // --------------------------------------------------------
      // Custom Validation Error Response
      // --------------------------------------------------------
      // Converts NestJS validation errors into a simple and
      // consistent API response format.
      exceptionFactory: (errors) => {
        // Extract validation messages from each error.
        const messages = errors
          .map((error) => Object.values(error.constraints || {}))
          .flat()
          .join(', ');

        // Return a BadRequestException with our custom format.
        return new BadRequestException({
          success: false,
          message: messages,
        });
      },
    }),
  );

  // ==========================================================
  // Global Exception Filters
  // ==========================================================

  // These filters handle application-level exceptions globally.
  //
  // CustomExceptionFilter:
  // Handles general/custom application exceptions.
  //
  // PrismaExceptionFilter:
  // Handles Prisma/database-related exceptions and converts
  // them into cleaner API responses.
  app.useGlobalFilters(
    new CustomExceptionFilter(),
    new PrismaExceptionFilter(),
  );

  // ==========================================================
  // Get Express Instance
  // ==========================================================

  // Retrieves the underlying Express application instance.
  // This allows us to create custom Express routes directly.
  const expressApp = app.getHttpAdapter().getInstance();

  // ==========================================================
  // Payment Success Route
  // ==========================================================
  expressApp.get('/success', (req, res) => {
    // Get the payment session ID from query parameters.
    const sessionId = String(req.query.session_id || '');
    // Generate and return the payment success page.
    res.status(200).send(getPaymentSuccessHtml(sessionId));
  });

  // ==========================================================
  // Payment Failed Route
  // ==========================================================
  expressApp.get('/failed', (req, res) => {
    // Generate and return the payment failed page.
    res.status(200).send(getPaymentFailedHtml());
  });

  // ==========================================================
  // Storage Configuration
  // ==========================================================

  // Configure TanvirStorage.
  //
  // Current driver:
  // local
  //
  // The configuration also contains S3/MinIO credentials
  // so the storage system can work with MinIO when required.
  TanvirStorage.config({
    driver: 'local',
    connection: {
      // Base URL for storage.
      rootUrl: appConfig().storageUrl.rootUrl,
      // Public URL used to access uploaded files.
      publicUrl: appConfig().storageUrl.rootUrlPublic,
      // S3 / MinIO bucket name.
      awsBucket: appConfig().fileSystems.s3.bucket,
      // S3 / MinIO access key.
      awsAccessKeyId: appConfig().fileSystems.s3.key,
      // S3 / MinIO secret key.
      awsSecretAccessKey: appConfig().fileSystems.s3.secret,
      // S3 / MinIO region.
      awsDefaultRegion: appConfig().fileSystems.s3.region,
      // Custom endpoint used by MinIO.
      awsEndpoint: appConfig().fileSystems.s3.endpoint,
      // Enable MinIO-specific configuration.
      minio: true,
    },
  });

  // ==========================================================
  // Swagger API Documentation
  // ==========================================================

  // Configure Swagger/OpenAPI documentation.
  const options = new DocumentBuilder()

    // API documentation title.
    .setTitle(`${process.env.APP_NAME} api`)

    // API documentation description.
    .setDescription(`${process.env.APP_NAME} api docs`)

    // API documentation version.
    .setVersion('1.0')

    // Add application name as a Swagger tag.
    .addTag(`${process.env.APP_NAME}`)

    // Enable Bearer Token authentication in Swagger.
    //
    // This allows testing protected APIs using JWT tokens.
    .addBearerAuth()

    .build();

  // Generate Swagger/OpenAPI document from the
  // application's controllers and decorators.
  const document = SwaggerModule.createDocument(app, options);

  // ----------------------------------------------------------
  // Swagger UI Route
  // ----------------------------------------------------------
  // Swagger documentation will be available at:
  //
  // /api/docs
  //
  // Example:
  // https://your-domain.com/api/docs
  SwaggerModule.setup('api/docs', app, document);

  // ==========================================================
  // Server Host Configuration
  // ==========================================================

  // Read HOST from environment variables.
  //
  // If HOST is not provided, use the application config.
  // Finally fallback to 0.0.0.0.
  //
  // 0.0.0.0 allows the server to accept connections
  // from all network interfaces.
  const host = process.env.HOST?.trim() || appConfig().app.host || '0.0.0.0';

  // ==========================================================
  // Server Port Configuration
  // ==========================================================

  // Read PORT from environment variables.
  //
  // If PORT is not available, use the port from app config.
  // If that is also unavailable/invalid, fallback to 4000.

  const port =
    Number.parseInt(process.env.PORT ?? String(appConfig().app.port), 10) ||
    4000;

  // ==========================================================
  // Start Server
  // ==========================================================

  // Start the NestJS server using the configured host and port.
  await app.listen(port, host);
}

bootstrap();
