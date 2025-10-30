import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB = async () => {
    try {
        // Prefer MONGODB_URI, fall back to MONGODB_URL, otherwise default to local
        const uriBase = process.env.MONGODB_URI || process.env.MONGODB_URL || "mongodb://localhost:27017";
        const connectionString = uriBase.includes(DB_NAME) ? uriBase : `${uriBase.replace(/\/+$/, "")}/${DB_NAME}`;

        const connectionInstance = await mongoose.connect(connectionString, {
            // recommended options can be added here
        });

        console.log(`MongoDB connected — host: ${connectionInstance.connection.host}`);

    } catch (error) {
        console.log("mongoDB Connection error", error);
        process.exit(1);
    }
};

export default connectDB