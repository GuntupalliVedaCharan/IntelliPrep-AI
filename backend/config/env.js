require('dotenv').config();

const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missingEnvVars.join(', ')}. Create backend/.env from backend/.env.example.`
  );
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
};
