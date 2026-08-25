const express = require('express');
const config = require('./src/config/env');
const { initDatabase } = require('./src/config/db');
const seedDatabase = require('./src/db/seedData');
const setupSecurityMiddleware = require('./src/middleware/security');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const SLAService = require('./src/services/slaService');

// Import Routers
const healthRoutes = require('./src/routes/healthRoutes');
const authRoutes = require('./src/routes/authRoutes');
const museumRoutes = require('./src/routes/museumRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const recommendationRoutes = require('./src/routes/recommendationRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');
const complaintRoutes = require('./src/routes/complaintRoutes');

const app = express();

// Initialize Security & Standard Middleware
setupSecurityMiddleware(app);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount API Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', museumRoutes);
app.use('/api', chatRoutes);
app.use('/api', recommendationRoutes);
app.use('/api', bookingRoutes);
app.use('/api', ticketRoutes);
app.use('/api', complaintRoutes);

// Root route handler
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Government Museum & Zoo Visitor Assistance Platform API',
    version: '1.0.0',
    phase: 'Phase 8 Complaint Management, AI Auto-Classification & SLA Escalation',
    documentation: '/api/health'
  });
});

// Centralized Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server & Initialize Database
const PORT = config.port;

function startServer() {
  initDatabase();
  seedDatabase();

  // Periodic SLA Background Processor (runs every 15 minutes)
  setInterval(() => {
    try {
      SLAService.checkAndProcessSLAEscalations();
    } catch (e) {
      console.error('[SLA Background Processor Error]', e.message);
    }
  }, 15 * 60 * 1000);

  return app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(`🚀 Museum & Zoo Platform API Server Running`);
    console.log(`🌐 Environment : ${config.nodeEnv}`);
    console.log(`📍 Server URL  : http://localhost:${PORT}`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📢 Complaints  : http://localhost:${PORT}/api/complaints`);
    console.log(`========================================================`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
