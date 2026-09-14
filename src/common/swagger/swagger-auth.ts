import { DocumentBuilder } from '@nestjs/swagger';
import { Role } from '../guard/role/role.enum';

export const SWAGGER_AUTH = {
  ADMIN: 'admin-token',
  USER: 'user-token',
} as const;

export type SwaggerAuthValue = (typeof SWAGGER_AUTH)[keyof typeof SWAGGER_AUTH];

// Role to Auth Key mapping (uppercase Role enum to lowercase auth key)
export const roleToAuthKey: Record<Role, SwaggerAuthValue> = {
  [Role.ADMIN]: SWAGGER_AUTH.ADMIN,
  [Role.USER]: SWAGGER_AUTH.USER,
};

// Helper function to get auth key from role string
export function getAuthKeyFromRole(role: string | Role): SwaggerAuthValue {
  const roleUpper = role.toString().toUpperCase() as Role;
  return roleToAuthKey[roleUpper] || SWAGGER_AUTH.USER;
}

export function buildSwaggerOptions() {
  const builder = new DocumentBuilder()
    .setTitle(`${process.env.APP_NAME} API`)
    .setVersion('1.0')
    .addServer(process.env.SWAGGER_SERVER_URL || '/');

  builder.addBearerAuth({
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    in: 'header',
    description: 'Enter a JWT access token',
  });

  Object.values(SWAGGER_AUTH).forEach((name) => {
    builder.addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        description: `Enter JWT token for ${name.replace('-token', '').replace(/_/g, ' ')} role`,
      },
      name,
    );
  });

  return builder.build();
}

// Pure JavaScript version for Swagger interceptor (no TypeScript types)
export const swaggerUiOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
};

// Test credentials — only ADMIN and USER
export const TEST_CREDENTIALS = {
  'System Admin': {
    email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
    password: process.env.ADMIN_PASSWORD || '123456',
    role: Role.ADMIN,
    authKey: SWAGGER_AUTH.ADMIN,
  },
  'Regular User': {
    email: process.env.USER_EMAIL || 'user1@gmail.com',
    password: process.env.USER_PASSWORD || '123456',
    role: Role.USER,
    authKey: SWAGGER_AUTH.USER,
  },
};

export function getTestCredentialsByRole(role: Role) {
  const credentialEntry = Object.values(TEST_CREDENTIALS).find(
    (cred) => cred.role === role,
  );
  return credentialEntry || null;
}

export function getAllTestCredentials() {
  return Object.entries(TEST_CREDENTIALS).map(([name, creds]) => ({
    name,
    ...creds,
  }));
}