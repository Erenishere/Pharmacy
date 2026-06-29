/**
 * Socket Service
 * Handles real-time communication for chat and dashboard updates
 */
class SocketService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize Socket.io
   * @param {Object} server - HTTP server instance
   */
  init(server) {
    // Note: socket.io needs to be installed: npm install socket.io
    const { Server } = require('socket.io');

    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {

      // Join a specific channel/room
      socket.on('join-channel', (channelId) => {
        socket.join(channelId);
      });

      // Leave a channel/room
      socket.on('leave-channel', (channelId) => {
        socket.leave(channelId);
      });

      socket.on('disconnect', () => {
      });
    });

    return this.io;
  }

  /**
   * Broadcast message to a specific channel
   * @param {String} channelId - Target channel
   * @param {String} event - Event name
   * @param {Object} data - Message payload
   */
  emitToChannel(channelId, event, data) {
    if (this.io) {
      this.io.to(channelId).emit(event, data);
    }
  }

  /**
   * Broadcast real-time dashboard updates
   * @param {String} metricType - Type of metric (e.g., 'sales', 'inventory')
   * @param {Object} data - Updated metric data
   */
  broadcastUpdate(metricType, data) {
    if (this.io) {
      this.io.emit('dashboard-update', { type: metricType, data });
    }
  }
}

module.exports = new SocketService();
