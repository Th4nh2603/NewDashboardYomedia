import "dotenv/config";
import express from "express";
import cors from "cors";
import { sftpRouter } from "./routes/sftp.js";
import { uploadRouter } from "./routes/upload.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: (origin: string | undefined, cb: (err: null, allow: boolean | string) => void) =>
      cb(null, origin || true),
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(express.json({ limit: "50mb" }));

app.use("/api/sftp", sftpRouter);
app.use("/api/upload", uploadRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
