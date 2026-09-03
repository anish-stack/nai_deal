const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const ConnectDb = require('./database/Database');
const router = require('./routes/Routes');
const PORT = process.env.PORT || 4255;
const morgan = require('morgan');
const sendToken = require('./utils/SendToken');
const OtherRoutes = require('./routes/OtherRoutes')
const jwt = require('jsonwebtoken');
require('./config/razorpay'); // validates Razorpay credentials at boot
// CORS is configured in exactly one place. The previous setup had a manual
// header block AND cors() fighting each other, and paired Origin:* with
// Allow-Credentials:true - a combination every browser rejects outright.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Allow server-to-server / curl / mobile (no Origin header).
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0) return callback(null, true); // dev default
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Connect to database
ConnectDb();

// Middlewares
app.use(cookieParser());

// `verify` stashes the untouched request body. The Razorpay webhook signature
// is an HMAC of the exact bytes sent, so re-stringifying the parsed object
// would not match.
app.use(express.json({
    limit: '500mb',
    verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); }
}));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
// app.use(morgan('common'));

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'UP' });
});


app.post('/admin-login', (req, res) => {
    const { email, password } = req.body || {};

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.error('[admin-login] ADMIN_EMAIL / ADMIN_PASSWORD are not set in .env');
        return res.status(503).json({ message: 'Admin login is not configured on the server' });
    }

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    const emailOk = String(email).trim().toLowerCase() === String(adminEmail).trim().toLowerCase();
    const passwordOk = String(password) === String(adminPassword);

    if (emailOk && passwordOk) {
        const token = jwt.sign(
            { role: 'admin', email: adminEmail },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_TIME || '2d' }
        );
        return res.json({ message: 'Login successful', login: true, token });
    }

    return res.status(401).json({ message: 'Invalid credentials' });
})

// Routes
app.get('/', (req, res) => {
    res.send(`I am From Coupons Backend Server Running On Port Number ${PORT}`);
});

app.use('/api/v1', router);
app.use('/api/v1/Other', OtherRoutes);

// Unknown route -> JSON 404 instead of Express's HTML page.
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

app.use((err, req, res, next) => {
    console.error('Unhandled Error Stack:', err.stack);
    console.error('Error Message:', err.message);
    console.error('Request URL:', req.originalUrl);
    console.error('Request Method:', req.method);
    res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again later.',
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is Running On Port Number ${PORT}`);
});

// Handle unhandled promise rejections without killing the whole server -
// log it, keep serving other requests.
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
});

// Same for uncaught exceptions - log instead of a hard crash.
process.on('uncaughtException', (err) => {
    console.error(`Uncaught Exception: ${err.message}`);
});
