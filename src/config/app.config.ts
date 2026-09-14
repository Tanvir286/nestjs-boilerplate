export default () => ({
  /*=========================================================
                        application Configuration
  ==========================================================*/
  // URL, host, port, and client application URL.

  app: {
    // Application name
    name: process.env.APP_NAME,
    // Application key.
    key: process.env.APP_KEY,
    // Backend application URL
    url: process.env.APP_URL,
    // Frontend / client application URL.
    client_app_url: process.env.CLIENT_APP_URL,
    // Server host.
    host: process.env.HOST?.trim() || '0.0.0.0',
    // Server port.
    port: parseInt(process.env.PORT ?? '4000', 10) || 4000,
  },

  /*==========================================================
             File System / Cloud Storage Configuration
  ==========================================================*/

  fileSystems: {
    // Local/public storage configuration.
    public: {},
    // AWS S3 / MinIO storage configuration.
    s3: {
      driver: 's3',
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_DEFAULT_REGION,
      bucket: process.env.AWS_BUCKET,
      url: process.env.AWS_URL,
      endpoint: process.env.AWS_ENDPOINT,
    },
    // Google Cloud Storage configuration.
    gcs: {
      driver: 'gcs',
      projectId: process.env.GCP_PROJECT_ID,
      keyFile: process.env.GCP_KEY_FILE,
      apiEndpoint: process.env.GCP_API_ENDPOINT,
      bucket: process.env.GCP_BUCKET,
    },
  },

  /*==========================================================
                      Database Configuration
   ==========================================================*/

  database: {
    url: String(process.env.DATABASE_URL),
  },

  /*==========================================================
                    Redis Configuration
  ========================================================== */

  redis: {
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD || '',
    port: process.env.REDIS_PORT,
  },

  /*==========================================================
                     Security Configuration
  ========================================================== */

  security: {
    // Number of salt rounds used for password hashing.
    salt: 10,
  },

  /*==========================================================
                    JWT Configuration
  ========================================================== */

  jwt: {
    // Secret key used to sign and verify JWT tokens.
    secret: process.env.JWT_SECRET,
    // Token expiration time.
    // Example: "1d", "7d", "24h".
    expiry: process.env.JWT_EXPIRY,
  },

  /*==========================================================
                   Google Maps Configuration
  ========================================================== */

  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },

  /*==========================================================
                    Mail Configuration
  ========================================================== */

  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 587,
    user: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM_ADDRESS,
  },

  /*==========================================================
                Social Authentication Configuration
  ========================================================== */
  // OAuth configuration for social login providers.

  auth: {
    // Google OAuth Configuration
    google: {
      app_id: process.env.GOOGLE_APP_ID,
      app_secret: process.env.GOOGLE_APP_SECRET,
      callback: process.env.GOOGLE_CALLBACK_URL,
    },
  },

  /*==========================================================
                   Payment Configuration
  ========================================================== */

  payment: {
    // Stripe Configuration
    stripe: {
      secret_key: process.env.STRIPE_SECRET_KEY,
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    paypal: {
      client_id: process.env.PAYPAL_CLIENT_ID,
      secret: process.env.PAYPAL_SECRET,
      api: process.env.PAYPAL_API,
    },
  },

  /*==========================================================
                   Storage Configuration
  ========================================================== */
  /**
   * Defines the directory structure used for storing
   * different types of uploaded files.
   *
   * rootUrl:
   *   Physical/local storage directory.
   *
   * rootUrlPublic:
   *   Public URL prefix used to access stored files.
   */

  storageUrl: {
    // Physical storage directory.
    rootUrl: './public/storage',

    // Public URL used to access stored files.
    rootUrlPublic: '/public/storage',

    // storage directory
    package: '/package',
    booking: '/booking',
    destination: '/destination',
    blog: '/blog',
    avatar: '/avatar',
    verification: '/verification',
    maidResume: '/maid-resume',
    portfolio: '/portfolio',
    websiteInfo: '/website-info',
    maidverification: '/maid-verification',
    jobPhoto: 'job-photo/',
    // chat
    attachment: 'attachment/',
  },

  /*==========================================================
                    Default User Configuration
  ========================================================== */
  // Configuration for the default user.

  defaultUser: {
    system: {
      username: process.env.SYSTEM_USERNAME,
      email: process.env.SYSTEM_EMAIL,
      password: process.env.SYSTEM_PASSWORD,
    },
  },
});
