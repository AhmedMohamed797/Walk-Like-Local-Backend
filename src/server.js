import './config/env.js';
import connectDB from './config/db.js';
import app from './app.js';
import logger from './utils/logger.js';
import { startBookingJobs, stopBookingJobs } from './modules/bookings/jobs/bookingJobs.js';

const PORT = process.env.PORT;

const server = await connectDB();

const expressServer = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  startBookingJobs();
});

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  stopBookingJobs();
  expressServer.close(async () => {
    await import('mongoose').then(({ default: mongoose }) => mongoose.connection.close());
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));