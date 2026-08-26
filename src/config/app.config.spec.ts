import appConfig from './app.config';

describe('appConfig', () => {
  it('defaults to binding on all interfaces and uses the expected port', () => {
    const previousPort = process.env.PORT;
    const previousHost = process.env.HOST;

    delete process.env.PORT;
    delete process.env.HOST;

    const config = appConfig();

    expect(config.app.host).toBe('0.0.0.0');
    expect(config.app.port).toBe(4000);

    if (previousPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = previousPort;
    }

    if (previousHost === undefined) {
      delete process.env.HOST;
    } else {
      process.env.HOST = previousHost;
    }
  });
});
