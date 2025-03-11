const User = require('../models/user.model');
const { logger } = require('../utils/logger');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is already registered',
      });
    }
    
    // Create the user
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      company: req.body.company,
      role: req.body.role || 'user',
    });
    
    // Generate JWT token
    const token = newUser.generateAuthToken();
    
    // Exclude password from response
    newUser.password = undefined;
    
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: newUser,
        token,
      },
    });
  } catch (error) {
    logger.error('Error registering user:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to register user',
      error: error.message,
    });
  }
};

/**
 * Login a user
 * @route POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password',
      });
    }
    
    // Find the user by email
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists and password is correct
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password',
      });
    }
    
    // Generate JWT token
    const token = user.generateAuthToken();
    
    // Update last login time
    user.lastLogin = new Date();
    await user.save();
    
    // Exclude password from response
    user.password = undefined;
    
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    logger.error('Error logging in user:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message,
    });
  }
};

/**
 * Get the currently authenticated user
 * @route GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    // Get the user from the request object (set by the auth middleware)
    const user = req.user;
    
    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile',
      error: error.message,
    });
  }
};

/**
 * Update user profile
 * @route PATCH /api/auth/me
 */
const updateProfile = async (req, res) => {
  try {
    // Fields that are allowed to be updated
    const allowedFields = ['name', 'company', 'attributes'];
    
    // Filter the request body to only include allowed fields
    const filteredBody = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

/**
 * Change user password
 * @route PATCH /api/auth/password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Check if passwords are provided
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide current and new password',
      });
    }
    
    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    // Check if current password is correct
    if (!(await user.correctPassword(currentPassword, user.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect',
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Generate new token
    const token = user.generateAuthToken();
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully',
      data: {
        token,
      },
    });
  } catch (error) {
    logger.error('Error changing password:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
      error: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};