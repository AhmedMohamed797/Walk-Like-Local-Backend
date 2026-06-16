import logger from "../../../utils/logger.js";
import {
  processExpiredBookings,
  processCompletedBookings,
} from "../bookingService.js";

const JOB_INTERVAL_MS = 240 * 1000;

let intervalId = null;

const runBookingJobs = async () => {
  try {
    const expiredCount = await processExpiredBookings();
    const completedCount = await processCompletedBookings();

    if (expiredCount > 0 || completedCount > 0) {
      logger.info(
        `Booking jobs: expired ${expiredCount} pending payment(s), completed ${completedCount} active booking(s)`,
      );
    }
  } catch (error) {
    logger.error(`Booking jobs failed: ${error.message}`);
  }
};

export const startBookingJobs = () => {
  if (intervalId) return;

  runBookingJobs();
  intervalId = setInterval(runBookingJobs, JOB_INTERVAL_MS);
  logger.info("Booking scheduled jobs started (runs every 240 seconds)");
};

export const stopBookingJobs = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
