import dotenv from "dotenv";

dotenv.config();

const requiredVars = ["PORT", "NODE_ENV", "MONGODB_URI", "FRONTEND_URL", "JWT_SECRET"];

const missingVars = requiredVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(", ")}`);
  process.exit(1);
}

const config = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  mongodbUri: process.env.MONGODB_URI,
  frontendUrl: process.env.FRONTEND_URL,
};

export default config;
