import { NestApplication } from '@nestjs/core';

import { createTestApp, destroyTestApp } from './utils';

describe('AppModule', () => {
  let app: NestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await destroyTestApp(app);
  });

  it('should success', () => {
    expect(true).toBeTruthy();
  });
});
