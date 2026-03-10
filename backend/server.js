const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure Nodemailer Transporter
// Requires EMAIL_USER and EMAIL_PASS to be set in a .env file
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.log("Transporter verification error. This usually means your credentials are bad or you didn't create an App Password.");
        console.log(error);
    } else {
        console.log("Server is ready to take our messages");
    }
});

// API Route to handle contact form submission
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, service, message } = req.body;

        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({ error: 'Name, email, and message are required fields.' });
        }

        // Email layout
        const mailOptions = {
            from: `"EME Building Website" <${process.env.EMAIL_USER}>`, // MUST match the authenticated Gmail account to prevent spam
            replyTo: email,               // This allows you to click "Reply" in Yahoo and reply to the customer directly
            to: 'wilberbaos@yahoo.com',   // Sent TO the site owner
            subject: `New Lead from EME Building: ${service}`,
            html: `
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                <p><strong>Service Requested:</strong> ${service || 'General'}</p>
                <br/>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        };

        // Send the email
        await transporter.sendMail(mailOptions);

        res.status(200).json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
