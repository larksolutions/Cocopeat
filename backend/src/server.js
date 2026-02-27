import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors'; // <-- Must be imported
import path from 'path';

import batchesRoutes from './routes/batchesRoutes.js';
import { initializeFirebase } from './config/db.js';
import rateLimiter from './middleware/rateLimiter.js';


dotenv.config();

const app = express();
const PORT= 5001;
const __dirname = path.resolve();


// 🎯 CRITICAL FIX: UNIVERSAL CORS POLICY
// This must be placed before any routes or JSON middleware to ensure
// the mobile app (and its localhost:8081 origin) is allowed access.
app.use(cors()); 


app.use(express.json());
// app.use(rateLimiter);

app.use("/api/batch", batchesRoutes);

if (process.env.NODE_ENV === "production") {
    // This block remains untouched and serves your static web frontend files.
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
    });
}

initializeFirebase();
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
