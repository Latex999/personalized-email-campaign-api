const User = require('../models/user.model');
const { logger } = require('../utils/logger');

/**
 * Get all users (admin only)
 * @route GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    
    // Execute query
    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-password');
    
    // Get total count
    const total = await User.countDocuments();
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: {
        users,
      },
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

/**
 * Get a user by ID
 * @route GET /api/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error(`Error fetching user ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user',
      error: error.message,
    });
  }
};

/**
 * Update a user (admin only)
 * @route PATCH /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    // Fields that are allowed to be updated by admin
    const allowedFields = ['name', 'email', 'company', 'role', 'attributes', 'isActive'];
    
    // Filter the request body to only include allowed fields
    const filteredBody = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        filteredBody[key] = req.body[key];
      }
    });
    
    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'User updated successfully',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user',
      error: error.message,
    });
  }
};

/**
 * Delete a user (admin only)
 * @route DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully',
      data: null,
    });
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}:`, error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user',
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};