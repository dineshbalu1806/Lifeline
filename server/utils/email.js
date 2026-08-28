const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    console.log('[EMAIL] SMTP not configured — emails will be logged to console');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const t = getTransporter();

  const logPayload = { to, subject, text: text || html?.substring(0, 200) };

  if (!t) {
    console.log('[EMAIL MOCK]', JSON.stringify(logPayload, null, 2));
    return { success: true, mocked: true };
  }

  try {
    const info = await t.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@lifeline.com',
      to,
      subject,
      text,
      html,
    });
    console.log('[EMAIL SENT]', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL ERROR]', error.message);
    return { success: false, error: error.message };
  }
};

const sendWelcomeEmail = async (donor) => {
  const name = donor.personalInfo?.fullName || donor.fullName || 'Donor';
  return sendEmail({
    to: donor.personalInfo?.email || donor.email,
    subject: 'Welcome to LifeLine Blood Bank!',
    html: `
      <div style="font-family: Arial; max-width: 560px; margin: 0 auto;">
        <div style="background: #d32f2f; color: #fff; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">LifeLine</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Blood Bank Management System</p>
        </div>
        <div style="padding: 28px; background: #fff; border: 1px solid #eee;">
          <h2 style="color: #333;">Welcome, ${name}!</h2>
          <p style="color: #666; line-height: 1.6;">Thank you for registering as a blood donor. Your willingness to donate can save up to 3 lives per donation.</p>
          <p style="color: #666; line-height: 1.6;">You will receive notifications when someone in your area needs your blood type. Please keep your profile up to date.</p>
          <div style="background: #fff5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #d32f2f; font-weight: 600; margin: 0;">Your Blood Group: ${donor.personalInfo?.bloodGroup || 'Not set'}</p>
          </div>
          <p style="color: #999; font-size: 13px;">Stay hydrated and healthy. We'll reach out when help is needed.</p>
        </div>
        <div style="background: #f8f9fa; padding: 16px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #eee; border-top: none;">
          <p style="color: #999; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} LifeLine Blood Bank Management System</p>
        </div>
      </div>
    `,
  });
};

const sendRequestMatchEmail = async (donor, request) => {
  const name = donor.personalInfo?.fullName || donor.fullName || 'Donor';
  return sendEmail({
    to: donor.personalInfo?.email || donor.email,
    subject: `URGENT: Blood donation needed in ${request.city}`,
    html: `
      <div style="font-family: Arial; max-width: 560px; margin: 0 auto;">
        <div style="background: #d32f2f; color: #fff; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">Blood Request Alert</h1>
        </div>
        <div style="padding: 28px; background: #fff; border: 1px solid #eee;">
          <h2 style="color: #333;">Hello ${name},</h2>
          <p style="color: #666; line-height: 1.6;">A patient in your area needs your blood type. Here are the details:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px 12px; border: 1px solid #eee; color: #888;">Patient</td><td style="padding: 8px 12px; border: 1px solid #eee; font-weight: 600;">${request.patientName}</td></tr>
            <tr><td style="padding: 8px 12px; border: 1px solid #eee; color: #888;">Blood Type</td><td style="padding: 8px 12px; border: 1px solid #eee; font-weight: 600;">${request.bloodType}</td></tr>
            <tr><td style="padding: 8px 12px; border: 1px solid #eee; color: #888;">Units Needed</td><td style="padding: 8px 12px; border: 1px solid #eee; font-weight: 600;">${request.unitsNeeded}</td></tr>
            <tr><td style="padding: 8px 12px; border: 1px solid #eee; color: #888;">Hospital</td><td style="padding: 8px 12px; border: 1px solid #eee; font-weight: 600;">${request.hospitalName}</td></tr>
            <tr><td style="padding: 8px 12px; border: 1px solid #eee; color: #888;">City</td><td style="padding: 8px 12px; border: 1px solid #eee; font-weight: 600;">${request.city}</td></tr>
            ${request.urgency === 'yes' ? '<tr><td style="padding: 8px 12px; border: 1px solid #eee; color: #c62828;" colspan="2"><strong>URGENT</strong></td></tr>' : ''}
          </table>
          <p style="color: #666;">Please log in to your dashboard to accept this request if you can help.</p>
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 12px 28px; background: #d32f2f; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Request</a>
        </div>
      </div>
    `,
  });
};

const sendRequestAcceptedEmail = async (requesterEmail, request, donorName) => {
  return sendEmail({
    to: requesterEmail || request.requesterEmail,
    subject: `Donor found for ${request.patientName}!`,
    html: `
      <div style="font-family: Arial; max-width: 560px; margin: 0 auto;">
        <div style="background: #2e7d32; color: #fff; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">Donor Confirmed!</h1>
        </div>
        <div style="padding: 28px; background: #fff; border: 1px solid #eee;">
          <h2 style="color: #333;">Good News!</h2>
          <p style="color: #666; line-height: 1.6;">A donor has accepted your blood request for <strong>${request.patientName}</strong>.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 8px 12px; border: 1px solid #eee; color: #888;">Donor</td><td style="padding: 8px 12px; border: 1px solid #eee; font-weight: 600;">${donorName}</td></tr>
            <tr><td style="padding: 8px 12px; border: 1px solid #eee; color: #888;">Hospital</td><td style="padding: 8px 12px; border: 1px solid #eee; font-weight: 600;">${request.hospitalName}</td></tr>
          </table>
          <p style="color: #666;">Please coordinate with the hospital and donor for the donation.</p>
        </div>
      </div>
    `,
  });
};

const sendLowStockAlert = async (adminEmail, lowStockGroups) => {
  const groupsHtml = lowStockGroups
    .map((g) => `<tr><td style="padding: 8px 12px; border: 1px solid #eee; font-weight: 600;">${g.bloodGroup}</td><td style="padding: 8px 12px; border: 1px solid #eee; color: #e65100;">${g.units} units</td></tr>`)
    .join('');

  return sendEmail({
    to: adminEmail,
    subject: 'Low Blood Stock Alert',
    html: `
      <div style="font-family: Arial; max-width: 560px; margin: 0 auto;">
        <div style="background: #e65100; color: #fff; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">Low Stock Alert</h1>
        </div>
        <div style="padding: 28px; background: #fff; border: 1px solid #eee;">
          <p style="color: #666; line-height: 1.6;">The following blood groups are running low in inventory:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><th style="padding: 8px 12px; border: 1px solid #eee; background: #f5f5f5; text-align: left;">Blood Group</th><th style="padding: 8px 12px; border: 1px solid #eee; background: #f5f5f5; text-align: left;">Available Units</th></tr>
            ${groupsHtml}
          </table>
          <p style="color: #666;">Please arrange for new donations to replenish stock.</p>
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/dashboard" style="display: inline-block; padding: 12px 28px; background: #e65100; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600;">View Dashboard</a>
        </div>
      </div>
    `,
  });
};

module.exports = { sendEmail, sendWelcomeEmail, sendRequestMatchEmail, sendRequestAcceptedEmail, sendLowStockAlert };
