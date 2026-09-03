const jwt = require('jsonwebtoken');

/**
 * Issue a JWT and return it to the caller.
 *
 * The password hash is stripped from the payload - the old version returned
 * the whole mongoose document, hash included, on every login.
 */
const sendToken = async (user, res, statusCode = 200) => {
    try {
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_TIME || '2d' }
        );

        const safeUser = user.toObject ? user.toObject() : { ...user };
        delete safeUser.Password;
        delete safeUser.newPassword;
        delete safeUser.PasswordChangeOtp;

        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('token', token, {
            path: '/',
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 2 * 24 * 60 * 60 * 1000,
        });

        return res.status(statusCode).json({
            success: true,
            login: safeUser,
            user: safeUser,
            token,
        });
    } catch (error) {
        console.log('Error in generating token:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
};

module.exports = sendToken;
