import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { redisService } from './services/redis.service';




let isShuttingDown = false;


let server: http.Server;


const gracefulShutdown = async (signal: string) => {
  
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress. Ignoring signal.');
    return;
  }
  isShuttingDown = true;
  logger.warn(`${signal} received. Shutting down gracefully...`);

  try {
    
    
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          return reject(err);
        }
        logger.info('HTTP server closed.');
        resolve();
      });
    });

    
    const redisClient = redisService.getClient();
    if (redisClient?.isOpen) {
      await redisClient.quit();
      logger.info('Redis client disconnected.');
    }

    
    logger.info('Graceful shutdown complete.');
    process.exit(0);
    
  } catch (error) {
    
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};




const startServer = async () => {
  try {
    
    await redisService.connect();
    
    
    const app = await createApp();
    
    
    server = http.createServer(app);

    
    server.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
    });

    
    
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start server:', { error });
    process.exit(1);
  }
};

startServer();