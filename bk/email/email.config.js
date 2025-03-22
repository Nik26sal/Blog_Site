import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: `${process.env.EMAIL}`,
    pass: `${process.env.APP_PASSWORD}`,
  },
});
export {transporter}


  