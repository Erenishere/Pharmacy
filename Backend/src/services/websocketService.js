/**
 * WebSocket Service
 * Provides real-time communication for mobile sync, notifications, and live updates
 */

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const cacheService = require('./cacheService');
const { normalizeRole } = require('../utils/roleUtils');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket
    this.connectedSockets = new Map(); // socketId -> { userId, role, rooms }
    
    // Configuration
    this.config = {
      pingTimeout: 60000,
      pingInterval: 25000,
      maxConnectionsPerUser: 3,
    };
  }

  /**
   * Initialize WebSocket server
   * @param {http.Server} server - HTTP server instance
   */
  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: [process.env.FRONTEND_URL, 'http://localhost:4200'],
        credentials: true,
      },
      pingTimeout: this.config.pingTimeout,
      pingInterval: this.config.pingInterval,
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    console.log('[WebSocket] Server initialized');
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user exists and is active
        const User = require('../models/User');
        const user = await User.findById(decoded.userId).select('_id username role isActive');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        if (!user.isActive) {
          return next(new Error('User account is inactive'));
        }

        // Attach user data to socket
        socket.userId = user._id.toString();
        socket.userRole = normalizeRole(user.role);
        socket.userName = user.username;
        
        next();
      } catch (error) {
        console.error('[WebSocket] Authentication error:', error.message);
        next(new Error('Invalid token'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new connection
   * @param {Socket} socket - Socket instance
   */
  handleConnection(socket) {
    const userId = socket.userId;
    const role = socket.userRole;

    console.log(`[WebSocket] User ${userId} (${socket.userName}) connected`);

    // Check max connections per user
    const existingSockets = this.getUserSockets(userId);
    if (existingSockets.length >= this.config.maxConnectionsPerUser) {
      // Disconnect oldest connection
      const oldest = existingSockets[0];
      oldest.disconnect(true);
      console.log(`[WebSocket] Disconnected oldest connection for user ${userId}`);
    }

    // Register connection
    this.connectedUsers.set(socket.id, socket);
    this.connectedSockets.set(socket.id, {
      userId,
      role,
      rooms: new Set(),
      connectedAt: new Date(),
    });

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-based room
    if (role) {
      socket.join(`role:${role}`);
    }

    // Send initial sync data
    this.sendInitialSync(socket);

    // Setup event listeners
    this.setupSocketListeners(socket);

    // Notify other clients about user online status
    socket.broadcast.emit('user:online', {
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * Setup socket event listeners
   * @param {Socket} socket - Socket instance
   */
  setupSocketListeners(socket) {
    // Sync request from mobile
    socket.on('sync:request', async (data, callback) => {
      try {
        const syncData = await this.handleSyncRequest(socket.userId, data);
        callback({ success: true, data: syncData });
      } catch (error) {
        console.error('[WebSocket] Sync error:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Push changes from mobile
    socket.on('sync:push', async (data, callback) => {
      try {
        const result = await this.handleSyncPush(socket.userId, data);
        callback({ success: true, result });
      } catch (error) {
        console.error('[WebSocket] Sync push error:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Subscribe to specific entities
    socket.on('subscribe', (data) => {
      const { entity, id } = data;
      const room = `${entity}:${id}`;
      socket.join(room);
      
      const socketData = this.connectedSockets.get(socket.id);
      if (socketData) {
        socketData.rooms.add(room);
      }
      
      console.log(`[WebSocket] User ${socket.userId} subscribed to ${room}`);
    });

    // Unsubscribe
    socket.on('unsubscribe', (data) => {
      const { entity, id } = data;
      const room = `${entity}:${id}`;
      socket.leave(room);
      
      const socketData = this.connectedSockets.get(socket.id);
      if (socketData) {
        socketData.rooms.delete(room);
      }
    });

    // Ping/Pong for connection health
    socket.on('ping', (callback) => {
      callback({ timestamp: Date.now() });
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });
  }

  /**
   * Handle disconnect
   * @param {Socket} socket - Socket instance
   * @param {string} reason - Disconnect reason
   */
  handleDisconnect(socket, reason) {
    const userId = socket.userId;
    
    console.log(`[WebSocket] User ${userId} disconnected: ${reason}`);

    // Cleanup
    this.connectedUsers.delete(socket.id);
    this.connectedSockets.delete(socket.id);

    // Notify others
    socket.broadcast.emit('user:offline', {
      userId,
      timestamp: new Date(),
    });
  }

  /**
   * Handle sync request from mobile
   * @param {string} userId - User ID
   * @param {Object} data - Sync parameters
   */
  async handleSyncRequest(userId, data) {
    const { since, entities } = data;
    const sinceDate = new Date(since);

    const syncResults = {};

    // Get user's dimension filter if applicable
    const User = require('../models/User');
    const user = await User.findById(userId).select('dimensionId permissions');
    
    const dimensionFilter = user?.dimensionId ? { dimensionId: user.dimensionId } : {};

    for (const entity of entities) {
      switch (entity) {
        case 'customers':
          const Customer = require('../models/Customer');
          syncResults.customers = await Customer.find({
            ...dimensionFilter,
            updatedAt: { $gt: sinceDate },
          }).select('-__v').limit(1000);
          break;

        case 'items':
          const Item = require('../models/Item');
          syncResults.items = await Item.find({
            isActive: true,
            updatedAt: { $gt: sinceDate },
          }).select('-__v').limit(1000);
          break;

        case 'invoices':
          const Invoice = require('../models/Invoice');
          syncResults.invoices = await Invoice.find({
            salesmanId: userId,
            updatedAt: { $gt: sinceDate },
          }).select('-__v').limit(500);
          break;

        case 'stock':
          const Batch = require('../models/Batch');
          syncResults.stock = await Batch.find({
            updatedAt: { $gt: sinceDate },
          }).select('-__v').limit(1000);
          break;

        default:
          syncResults[entity] = [];
      }
    }

    return {
      serverTime: new Date(),
      changes: syncResults,
    };
  }

  /**
   * Handle sync push from mobile
   * @param {string} userId - User ID
   * @param {Object} data - Changes to sync
   */
  async handleSyncPush(userId, data) {
    const { changes } = data;
    const results = [];
    const conflicts = [];

    for (const change of changes) {
      try {
        // Process based on entity type
        switch (change.entity) {
          case 'order':
            const EOrder = require('../models/EOrder');
            const order = new EOrder({
              ...change.data,
              salesmanId: userId,
              status: 'pending',
            });
            await order.save();
            results.push({ id: change.id, status: 'created', serverId: order._id });
            break;

          case 'collection':
            const CashReceipt = require('../models/CashReceipt');
            const receipt = new CashReceipt({
              ...change.data,
              collectedBy: userId,
            });
            await receipt.save();
            results.push({ id: change.id, status: 'created', serverId: receipt._id });
            break;

          case 'visit':
            // Log customer visit
            results.push({ id: change.id, status: 'recorded' });
            break;

          default:
            results.push({ id: change.id, status: 'ignored' });
        }
      } catch (error) {
        conflicts.push({
          id: change.id,
          error: error.message,
          clientVersion: change.version,
        });
      }
    }

    return {
      processed: results.length,
      results,
      conflicts,
    };
  }

  /**
   * Send initial sync data to newly connected socket
   * @param {Socket} socket - Socket instance
   */
  async sendInitialSync(socket) {
    try {
      // Send system status
      socket.emit('system:status', {
        connected: true,
        serverTime: new Date(),
        version: process.env.API_VERSION || 'v1',
      });

      // Send any pending notifications
      const pendingNotifications = await this.getPendingNotifications(socket.userId);
      if (pendingNotifications.length > 0) {
        socket.emit('notifications:pending', pendingNotifications);
      }
    } catch (error) {
      console.error('[WebSocket] Error sending initial sync:', error);
    }
  }

  /**
   * Get pending notifications for user
   * @param {string} userId - User ID
   */
  async getPendingNotifications(userId) {
    try {
      const notifications = await cacheService.get(`notifications:${userId}`);
      return notifications || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Send message to specific user
   * @param {string} userId - User ID
   * @param {string} event - Event name
   * @param {any} data - Message data
   */
  sendToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Send message to users with specific role
   * @param {string} role - Role name
   * @param {any} data - Message data
   */
  sendToRole(role, data) {
    this.io.to(`role:${normalizeRole(role)}`).emit(data.type || 'notification', data);
  }

  /**
   * Broadcast message to all connected clients
   * @param {string} event - Event name
   * @param {any} data - Message data
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Send to specific entity subscribers
   * @param {string} entity - Entity type
   * @param {string} id - Entity ID
   * @param {any} data - Message data
   */
  sendToEntity(entity, id, data) {
    this.io.to(`${entity}:${id}`).emit(data.type || 'update', data);
  }

  /**
   * Get all sockets for a user
   * @param {string} userId - User ID
   * @returns {Array<Socket>}
   */
  getUserSockets(userId) {
    const sockets = [];
    for (const [socketId, data] of this.connectedSockets.entries()) {
      if (data.userId === userId) {
        const socket = this.connectedUsers.get(socketId);
        if (socket) {
          sockets.push(socket);
        }
      }
    }
    return sockets;
  }

  /**
   * Get connection statistics
   * @returns {Object}
   */
  getStats() {
    const roleCounts = {};
    
    for (const data of this.connectedSockets.values()) {
      roleCounts[data.role] = (roleCounts[data.role] || 0) + 1;
    }

    return {
      totalConnections: this.connectedUsers.size,
      uniqueUsers: new Set([...this.connectedSockets.values()].map(d => d.userId)).size,
      roleCounts,
    };
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  isUserOnline(userId) {
    for (const data of this.connectedSockets.values()) {
      if (data.userId === userId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Disconnect all sockets for a user
   * @param {string} userId - User ID
   */
  disconnectUser(userId) {
    const sockets = this.getUserSockets(userId);
    sockets.forEach(socket => {
      socket.disconnect(true);
    });
    console.log(`[WebSocket] Disconnected ${sockets.length} sockets for user ${userId}`);
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('[WebSocket] Shutting down...');
    
    // Notify all clients
    this.broadcast('system:shutdown', {
      message: 'Server is restarting',
      reconnect: true,
    });

    // Close all connections
    this.io.close();
    
    console.log('[WebSocket] Shutdown complete');
  }
}

// Export singleton instance
module.exports = new WebSocketService();
