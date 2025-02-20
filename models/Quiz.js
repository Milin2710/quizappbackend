const mongoose = require("mongoose");

// Define the question schema
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    required: true,
    validate: [arrayLimit, "{PATH} must have 4 options"], // Ensuring it has exactly 4 options
    default: ["", "", "", ""],
  },
  answer: {
    type: Number,
    required: true,
    min: 0, // Index of the correct answer (0-3)
    max: 3,
  },
});

// Function to ensure the options array has exactly 4 elements
function arrayLimit(val) {
  return val.length === 4;
}

// Define the main quiz schema
const quizSchema = new mongoose.Schema({
  quizname: { type: String, required: true },
  quizdesc: { type: String, required: true },
  numQuestions: { type: Number, required: true },
  questions: { type: [questionSchema], required: true }, // Array of question objects
});

// Create the model from the schema
const Quiz = mongoose.model("Quiz", quizSchema);

module.exports = Quiz;
