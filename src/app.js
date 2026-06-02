import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import config from "./config/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import routes from "./routes/index.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(cors({ origin: "*" }));
app.use(helmet());
app.use(cookieParser());

if (config.nodeEnv === "development") {
  app.use(morgan("dev"));
}

app.use("/api/v1", routes);

app.use(errorHandler);

export default app;
