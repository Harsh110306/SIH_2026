const User = require('../models/User');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Check if all required fields are provided
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide name, email, and password'
      });
    }

    // 2. Check if user already exists with the given email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // 3. Create the new user in MongoDB
    const newUser = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    // 4. Return success response
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Server error while registering user',
      error: error.message
    });
  }
};

module.exports = {
  registerUser
};

