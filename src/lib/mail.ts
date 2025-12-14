import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com", 
  port: 465,
  secure: true,
  auth: {
    user: "booking@fare1.co.uk", 
    pass: process.env.EMAIL_PASSWORD || "Xwa*n86hX2DQYorE", 
  },
});

export const sendVerificationEmail = async (email: string, code: string) => {
  try {
    await transporter.sendMail({
      from: '"Fare 1 Security" <booking@fare1.co.uk>',
      to: email,
      subject: "Admin Login Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background-color: #f4f4f4;">
          <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #D4AF37; text-align: center; margin-bottom: 20px;">Admin Verification</h2>
            <p style="text-align: center; color: #666;">Use the code below to complete your login:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="background: #000; color: #D4AF37; padding: 15px 30px; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">${code}</span>
            </div>
            <p style="text-align: center; font-size: 12px; color: #999;">This code expires in 5 minutes.</p>
          </div>
        </div>
      `,
    });
    console.log("Email sent successfully to", email);
    return true;
  } catch (error) {
    console.error("Email send failed:", error);
    return false;
  }
};