const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  //1) Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    //gmail allows only 500 mails per day
    // Activate in gmail "less secure app" option
  });
  //2) Define the email options
  const mailOptions = {
    from: 'Ajay Kuamr <kkajay549@gmail.com',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html
  };
  //3) Send the email using the nodemailer library
  //returns promise, it is an asynchronous option
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
