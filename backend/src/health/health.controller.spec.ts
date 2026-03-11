import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('should return ok status', () => {
    const controller = new HealthController();
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
