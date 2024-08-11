const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/smart-garbage', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    points: { type: Number, default: 0 },
    rewards: [{ type: String }]
});

const User = mongoose.model('User', UserSchema);

// Reward Schema
const RewardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    pointsRequired: { type: Number, required: true },
    imageUrl: { type: String, required: true }
});

const Reward = mongoose.model('Reward', RewardSchema);

// Register route
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ username, email, password });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = { user: { id: user.id } };
        jwt.sign(payload, 'secretKey', { expiresIn: 3600 }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const payload = { user: { id: user.id } };
        jwt.sign(payload, 'secretKey', { expiresIn: 3600 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get user profile
app.get('/api/profile', async (req, res) => {
    const token = req.header('x-auth-token');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, 'secretKey');
        const user = await User.findById(decoded.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Add points to user
app.post('/api/scan', async (req, res) => {
    const { userId, points } = req.body;

    try {
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.points += points;
        await user.save();
        res.json({ msg: 'Points added successfully', points: user.points });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get all rewards
app.get('/api/rewards', async (req, res) => {
    try {
        const rewards = await Reward.find();
        res.json(rewards);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Redeem reward
app.post('/api/redeem', async (req, res) => {
    const { userId, rewardId } = req.body;

    try {
        const user = await User.findById(userId);
        const reward = await Reward.findById(rewardId);

        if (user.points < reward.pointsRequired) {
            return res.status(400).json({ msg: 'Not enough points' });
        }

        user.points -= reward.pointsRequired;
        user.rewards.push(reward.name);
        await user.save();

        res.json({ msg: 'Reward redeemed successfully', points: user.points, rewards: user.rewards });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Multer setup for file uploads (for rewards images)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Add new reward (Admin only)
app.post('/api/rewards', upload.single('image'), async (req, res) => {
    const { name, description, pointsRequired } = req.body;
    const imageUrl = /uploads/${req.file.filename};

    try {
        const reward = new Reward({ name, description, pointsRequired, imageUrl });
        await reward.save();
        res.json({ msg: 'Reward added successfully', reward });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Start server
app.listen(PORT, () => console.log(Server running on port ${PORT}));
  
