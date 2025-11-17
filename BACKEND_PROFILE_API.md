# Backend API Endpoints Cần Thêm Cho Profile

## 1. Update Profile
**Endpoint:** `PUT /api/auth/profile`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "string",
  "fullname": "string",
  "email": "string"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Cập nhật thông tin thành công",
  "user": {
    "user_id": 1,
    "username": "newusername",
    "fullname": "Full Name",
    "email": "newemail@example.com",
    "avatar_url": "https://...",
    "role": "user"
  }
}
```

**Response Error (400/500):**
```json
{
  "error": "Email already exists" 
}
```

---

## 2. Upload Avatar
**Endpoint:** `POST /api/auth/upload-avatar`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Request Body (FormData):**
```
avatar: File (image file)
```

**Response Success (200):**
```json
{
  "success": true,
  "message": "Upload avatar thành công",
  "avatar_url": "https://storage.googleapis.com/.../avatar.jpg"
}
```

**Response Error (400/500):**
```json
{
  "error": "Invalid file type" 
}
```

---

## Cách Implement Trong Backend (Node.js/Express)

### 1. Profile Update Route (`routes/auth.js`):
```javascript
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

// PUT /api/auth/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id; // Từ JWT middleware
    const { username, fullname, email } = req.body;

    // Validate input
    if (!username || !email) {
      return res.status(400).json({ error: 'Username và email là bắt buộc' });
    }

    // Check if email already exists (except current user)
    const existingUser = await User.findOne({ 
      where: { 
        email,
        user_id: { [Op.ne]: userId }
      } 
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email đã được sử dụng' });
    }

    // Update user
    await User.update(
      { username, fullname, email },
      { where: { user_id: userId } }
    );

    // Get updated user
    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'password_reset_token', 'password_reset_expires'] }
    });

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Cập nhật thông tin thất bại' });
  }
});

module.exports = router;
```

### 2. Avatar Upload Route (`routes/auth.js`):
```javascript
const multer = require('multer');
const { admin } = require('../config/firebase'); // Firebase Admin SDK
const bucket = admin.storage().bucket();

// Multer config (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh'));
    }
  }
});

// POST /api/auth/upload-avatar
router.post('/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Không có file nào được upload' });
    }

    const userId = req.user.user_id;
    const file = req.file;

    // Create unique filename
    const filename = `avatars/${userId}_${Date.now()}_${file.originalname}`;
    const fileUpload = bucket.file(filename);

    // Upload to Firebase Storage
    await fileUpload.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
      public: true,
    });

    // Get public URL
    const avatarUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    // Update user avatar_url in database
    await User.update(
      { avatar_url: avatarUrl },
      { where: { user_id: userId } }
    );

    res.json({
      success: true,
      message: 'Upload avatar thành công',
      avatar_url: avatarUrl
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Upload avatar thất bại' });
  }
});
```

### 3. Don't Forget To Add Routes in `app.js`:
```javascript
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
```

---

## Testing với Postman/Thunder Client

### Test Update Profile:
```
PUT http://localhost:8001/api/auth/profile
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json
Body (JSON):
{
  "username": "testuser",
  "fullname": "Test User Full Name",
  "email": "testuser@example.com"
}
```

### Test Upload Avatar:
```
POST http://localhost:8001/api/auth/upload-avatar
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
Body (form-data):
  avatar: [Select an image file]
```
