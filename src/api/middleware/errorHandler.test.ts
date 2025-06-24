import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { errorHandler } from './errorHandler';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger');

describe('errorHandler Middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
  });

  it('should handle generic errors and return a 500 status', async () => {
    app.get('/error', (req: Request, res: Response, next: NextFunction) => {
      next(new Error('A generic, non-operational error'));
    });
    app.use(errorHandler);

    const response = await request(app).get('/error');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'error',
      message: 'An unexpected internal server error occurred.',
    });
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('UNHANDLED ERROR:'));
  });
});
