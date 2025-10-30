import mongoose from "mongoose";
// Note: This import is likely incorrect. Based on your previous errors, 
// the file most likely uses a default export.
// Corrected import to match common practice.
import apiError from "../utils/apiError.js";

const errorHandler = (err, req, res, next) => {
    // A more robust way to handle the incoming error object
    let error = err;

    // Check if the error is an instance of our custom ApiError class.
    // If not, we create a new ApiError instance to standardize the response.
    if (!(error instanceof apiError)) {
        // Handle common errors like Mongoose validation errors or server errors.
        // We use the correct variable name 'error'
        const statusCode = error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
        
        const message = error.message || "Something went wrong";
        
        // Reassign the error variable to our new, standardized ApiError object.
        error = new apiError(
            statusCode,
            message,
            error.errors || [], // Pass existing errors if available
            error.stack
        );
    }

    // Standardize the response payload
    const response = {
        ...error,
        message: error.message,
        // Corrected the typo from 'proccess' to 'process'
        ...(process.env.NODE_ENV === "development" ? {
            stack: error.stack
        } : {})
    };

    // The most important fix: You must send a response back to the client.
    // The previous code did not have this, causing it to hang.
    return res.status(error.statusCode).json(response);
};

export { errorHandler };