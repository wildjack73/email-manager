require('dotenv').config();

module.exports = {
    host: process.env.EMAIL_HOST || 'ssl0.ovh.net',
    port: parseInt(process.env.EMAIL_PORT) || 993,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    tls: true, // Use TLS by default (port 993)
    tlsOptions: {
        rejectUnauthorized: false,
        servername: process.env.EMAIL_HOST || 'ex.mail.ovh.net'
    }
};
