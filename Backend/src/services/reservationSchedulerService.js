/**
 * Reservation Scheduler Service
 * Handles scheduled tasks for reservation management
 * Requirement 10.7: Auto-release expired reservations
 */

const inventoryService = require('./inventoryService');

class ReservationSchedulerService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkIntervalMinutes = 5; // Check every 5 minutes by default
  }

  /**
   * Start the scheduler
   * @param {number} intervalMinutes - Check interval in minutes (default: 5)
   */
  start(intervalMinutes = 5) {
    if (this.isRunning) {
      console.log('Reservation scheduler is already running');
      return;
    }

    this.checkIntervalMinutes = intervalMinutes;
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`Starting reservation scheduler (checking every ${intervalMinutes} minutes)...`);

    // Run immediately on start
    this.checkAndReleaseExpiredReservations();

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.checkAndReleaseExpiredReservations();
    }, intervalMs);

    this.isRunning = true;
    console.log('Reservation scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('Reservation scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('Reservation scheduler stopped');
  }

  /**
   * Check and release expired reservations
   */
  async checkAndReleaseExpiredReservations() {
    try {
      console.log('[Reservation Scheduler] Checking for expired reservations...');

      const result = await inventoryService.autoReleaseExpiredReservations({
        limit: 100, // Process up to 100 expired reservations per run
      });

      if (result.releasedCount > 0) {
        console.log(`[Reservation Scheduler] Released ${result.releasedCount} expired reservations`);
      }

      if (result.failedCount > 0) {
        console.error(`[Reservation Scheduler] Failed to release ${result.failedCount} reservations`);
        result.errors.forEach((err) => {
          console.error(`  - Reservation ${err.reservationId}: ${err.error}`);
        });
      }

      if (result.releasedCount === 0 && result.failedCount === 0) {
        console.log('[Reservation Scheduler] No expired reservations found');
      }

      return result;
    } catch (error) {
      console.error('[Reservation Scheduler] Error checking expired reservations:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get scheduler status
   * @returns {Object} Scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkIntervalMinutes: this.checkIntervalMinutes,
      nextCheckIn: this.isRunning
        ? `${this.checkIntervalMinutes} minutes`
        : 'Not scheduled',
    };
  }

  /**
   * Manually trigger a check (useful for testing)
   */
  async triggerCheck() {
    console.log('[Reservation Scheduler] Manual check triggered');
    return await this.checkAndReleaseExpiredReservations();
  }
}

// Export singleton instance
module.exports = new ReservationSchedulerService();
