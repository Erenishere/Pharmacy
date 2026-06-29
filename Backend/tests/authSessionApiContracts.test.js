const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../src/services/emailService', () => ({
  getTransporter: jest.fn(),
  isEmailConfigured: jest.fn(() => true),
  sendEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendPasswordResetOTP: jest.fn().mockResolvedValue(undefined),
}));

const app = require('../src/app');
const User = require('../src/models/User');
const authSessionStore = require('../src/services/authSessionStore');
const emailService = require('../src/services/emailService');

jest.setTimeout(120000);

describe('auth session API contracts', () => {
  let mongoServer;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'auth-session-api-test-secret';
    process.env.JWT_REFRESH_SECRET = 'auth-session-api-test-refresh-secret';
    process.env.JWT_EXPIRES_IN = '7d';
    process.env.JWT_REFRESH_EXPIRES_IN = '30d';

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), { dbName: 'auth_session_api_contracts' });
  });

  afterAll(async () => {
    await authSessionStore.clearAll();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
    await authSessionStore.clearAll();
    emailService.sendPasswordResetOTP.mockClear();

    await User.create({
      username: 'smoke.admin',
      email: 'smoke.admin@example.com',
      password: 'SmokePass123',
      role: 'admin',
      isActive: true,
    });
  });

  it('revokes both access and refresh token usage after logout', async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'smoke.admin',
        password: 'SmokePass123',
      })
      .expect(200);

    const { accessToken, refreshToken } = loginResponse.body.data;

    await request(app)
      .get('/api/v1/auth/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    const verifyAfterLogout = await request(app)
      .get('/api/v1/auth/verify')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);

    expect(verifyAfterLogout.body.error.code).toBe('TOKEN_EXPIRED');

    const refreshAfterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    expect(refreshAfterLogout.body.error.code).toBe('INVALID_TOKEN');
  });

  it('rotates refresh tokens and rejects reuse of the previous refresh token', async () => {
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'smoke.admin',
        password: 'SmokePass123',
      })
      .expect(200);

    const firstRefreshToken = loginResponse.body.data.refreshToken;

    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(200);

    const rotatedAccessToken = refreshResponse.body.data.accessToken;
    const rotatedRefreshToken = refreshResponse.body.data.refreshToken;

    expect(rotatedRefreshToken).toBeTruthy();
    expect(rotatedRefreshToken).not.toBe(firstRefreshToken);

    await request(app)
      .get('/api/v1/auth/verify')
      .set('Authorization', `Bearer ${rotatedAccessToken}`)
      .expect(200);

    const reusedRefreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);

    expect(reusedRefreshResponse.body.error.code).toBe('INVALID_TOKEN');
  });

  it('requires verified OTP before issuing a reset token and changing password', async () => {
    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'smoke.admin@example.com' })
      .expect(200);

    expect(emailService.sendPasswordResetOTP).toHaveBeenCalledTimes(1);
    const [, otp] = emailService.sendPasswordResetOTP.mock.calls[0];
    expect(otp).toMatch(/^\d{6}$/);

    const otpResponse = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ email: 'smoke.admin@example.com', otp })
      .expect(200);

    const resetToken = otpResponse.body.data.token;
    expect(resetToken).toBeTruthy();

    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'NewSmokePass123' })
      .expect(200);

    await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'smoke.admin',
        password: 'NewSmokePass123',
      })
      .expect(200);
  });
});
