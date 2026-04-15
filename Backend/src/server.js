require('dotenv').config();

const ServerConfig = require('./config/server');
const database = require('./config/database');
const { getClient, disconnect: disconnectRedis } = require('./config/redis');

class Server {
  constructor() {
    this.serverConfig = new ServerConfig();
    this.app = this.serverConfig.getApp();
    this.port = process.env.PORT || 3000;
    this.server = null;
  }

  async start() {
    try {
      // Connect to database
      await database.connect();

      // Initialise Redis client (non-blocking — app works without it)
      getClient();

      // Create optimized indexes (only in production/development, not in test)
      if (process.env.NODE_ENV !== 'test') {
        const { createOptimizedIndexes } = require('./config/indexOptimization');
        await createOptimizedIndexes();
        console.log('Database indexes optimized');
      }

      // Start reservation scheduler (only in production/development, not in test)
      if (process.env.NODE_ENV !== 'test') {
        const reservationScheduler = require('./services/reservationSchedulerService');
        const checkIntervalMinutes = parseInt(process.env.RESERVATION_CHECK_INTERVAL_MINUTES) || 5;
        reservationScheduler.start(checkIntervalMinutes);
        console.log(`Reservation scheduler started (checking every ${checkIntervalMinutes} minutes)`);
      }

      // Start server
      this.server = this.app.listen(this.port, () => {
        console.log(`Server running on port ${this.port}`);
        console.log(`Environment: ${process.env.NODE_ENV}`);
        console.log(`Health check: http://localhost:${this.port}/health`);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('Failed to start server:', error.message);
      process.exit(1);
    }
  }

  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

      // Stop reservation scheduler
      if (process.env.NODE_ENV !== 'test') {
        const reservationScheduler = require('./services/reservationSchedulerService');
        reservationScheduler.stop();
      }

      if (this.server) {
        this.server.close(async () => {
          console.log('HTTP server closed');

          try {
            await Promise.all([database.disconnect(), disconnectRedis()]);
            console.log('Database and Redis connections closed');
            process.exit(0);
          } catch (error) {
            console.error('Error during shutdown:', error.message);
            process.exit(1);
          }
        });
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(async () => {
          await database.disconnect();
          resolve();
        });
      });
    }
  }

  getApp() {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;
