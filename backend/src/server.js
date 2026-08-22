// Step 1: Import required packages
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const museumRoutes = require('./routes/museumRoutes');

// Step 2: Load environment variables from .env file
dotenv.config();

// Step 3: Connect to MongoDB Atlas
connectDB();

// Step 4: Create Express application instance
const app = express();

// Step 5: Add middleware to understand incoming JSON requests
app.use(express.json());

// Step 6: Routes
app.use('/api/users', userRoutes);
app.use('/api/museums', museumRoutes);

// Step 7: Simple test route (Health Check)
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend server is running smoothly!'
  });
});

// Step 8: Define port and start the server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
