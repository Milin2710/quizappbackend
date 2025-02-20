const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const Adminlogin = require("./models/Adminlogin");
const Quiz = require("./models/Quiz");
const QuizAttempt = require("./models/QuizAttempt");

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS setup
app.use(cors({ 
  credentials: true, 
  origin: "*"
}));

// Connect to MongoDB
mongoose
  .connect(
    "mongodb+srv://milins2710:milinsocin32@socin.mmlzaer.mongodb.net/dacoit"
  )
  .then(() => {
    console.log("mongodb connected");
  });

// Admin login route
app.post("/adminlogin", async (req, res) => {
  const { username, password } = req.body;
  const admin = await Adminlogin.findOne({ username });
  if (!admin) {
    return res.status(400).json("User not found");
  }
  const passOk = password === admin.password;
  if (passOk) {
    jwt.sign(
      { username, id: admin._id },
      "vwrgwjfgqkej13214h12kj4b1",
      {},
      (err, quiztoken) => {
        if (err) {
          console.error(err);
          return res.status(500).json("Failed to generate quiztoken");
        }
        // Send the JWT as a cookie
        res.cookie("quiztoken", quiztoken, {
          httpOnly: true, // Ensure the cookie is only accessible via HTTP(S) requests, not JavaScript
          secure: process.env.NODE_ENV === 'production', // Ensure cookies are only sent over HTTPS in production
        }).json({
          id: admin._id,
          username,
        });
      }
    );
  } else {
    res.status(400).json("Wrong credentials");
  }
});

// Add quiz route (protected by JWT)
app.post("/addquiz", async (req, res) => {
  const { quizname, quizdesc, numQuestions, questions } = req.body;
  const { quiztoken } = req.cookies;

  if (!quiztoken) {
    return res.status(401).json("No quiztoken provided.");
  }

  try {
    jwt.verify(quiztoken, "vwrgwjfgqkej13214h12kj4b1", async (err, info) => {
      if (err) {
        console.error("quiztoken verification error:", err);
        return res.status(401).json("Invalid quiztoken");
      }

      if (info.username !== "admin") {
        return res.status(403).json("Unauthorized user");
      }

      try {
        const newquiz = await Quiz.create({
          quizname,
          quizdesc,
          numQuestions,
          questions,
        });
        return res.json(newquiz);
      } catch (e) {
        console.log("Error creating quiz:", e);
        return res.status(500).json("Error creating quiz");
      }
    });
  } catch (e) {
    console.log("Error in /addquiz route:", e);
    return res.status(500).json("Internal server error");
  }
});

// Fetch all quizzes
app.get("/quizes", async (req, res) => {
  try {
    const quizes = await Quiz.find({}).select("-questions");
    res.json(quizes);
  } catch (e) {
    console.log(e);
  }
});

// Get quiz by ID
app.get("/quiz/:id", async (req, res) => {
  try {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    res.json(quiz);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "An error occurred while fetching the quiz" });
  }
});

// Submit answers to a quiz
app.post("/quiz/:id/submit-answers", async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "Answers must be an array" });
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    if (answers.length !== quiz.questions.length) {
      return res.status(400).json({
        message: "Number of answers does not match number of questions",
      });
    }

    let score = 0;
    const results = quiz.questions.map((question, index) => {
      const isCorrect = question.options[question.answer] === answers[index];
      if (isCorrect) score++;
      return {
        questionNumber: index + 1,
        yourAnswer: answers[index],
        correctAnswer: question.answer,
        isCorrect,
      };
    });

    const attempt = new QuizAttempt({
      quizId: id,
      answers,
      score,
      maxScore: quiz.questions.length,
    });
    await attempt.save();

    res.json({
      score,
      totalQuestions: quiz.questions.length,
    });
  } catch (error) {
    console.error("Error processing quiz submission:", error);
    res.status(500).json({
      message: "An error occurred while processing your submission",
    });
  }
});

// Server start
if (process.env.NODE_ENV !== "production") {
  app.listen(5000, () => {
    console.log("Server is running on port 5000");
  });
}

module.exports = app;
