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
app.options('*', cors());
app.use(cors({ credentials: true, origin: "*" }));

mongoose
  .connect(
    "mongodb+srv://milins2710:milinsocin32@socin.mmlzaer.mongodb.net/dacoit"
  )
  .then(() => {
    console.log("mongodb connected");
  });

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
        res.cookie("quiztoken", quiztoken, {}).json({
          id: admin._id,
          username,
        });
      }
    );
  } else {
    res.status(400).json("Wrong credentials");
  }
});

app.post("/addquiz", async (req, res) => {
  const { quizname, quizdesc, numQuestions, questions } = req.body;
  const { quiztoken } = req.cookies; // Getting the quiztoken from cookies

  if (!quiztoken) {
    return res.status(401).json("No quiztoken provided.");
  }

  try {
    // Verify the JWT token
    jwt.verify(quiztoken, "vwrgwjfgqkej13214h12kj4b1", async (err, info) => {
      if (err) {
        console.error("quiztoken verification error:", err);
        return res.status(401).json("Invalid quiztoken");
      }

      // Check if the username is "admin"
      if (info.username !== "admin") {
        return res.status(403).json("Unauthorized user");
      }

      // Create the new quiz if token is valid and user is admin
      try {
        const newquiz = await Quiz.create({
          quizname,
          quizdesc,
          numQuestions,
          questions,
        });
        return res.json(newquiz); // Respond with the newly created quiz data
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

app.get("/quizes", async (req, res) => {
  try {
    const quizes = await Quiz.find({}).select("-questions");
    res.json(quizes);
  } catch (e) {
    console.log(e);
  }
});

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
    res
      .status(400)
      .json({ message: "An error occurred while fetching the quiz" });
  }
});

app.post("/quiz/:id/submit-answers", async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;

    // Validate input
    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "Answers must be an array" });
    }

    // Find the quiz
    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Validate answers length
    if (answers.length !== quiz.questions.length) {
      return res.status(400).json({
        message: "Number of answers does not match number of questions",
      });
    }

    // Calculate score
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

    // Save attempt
    const attempt = new QuizAttempt({
      quizId: id,
      answers,
      score,
      maxScore: quiz.questions.length,
    });
    await attempt.save();

    // Return results
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

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allow any origin
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS"); // Allow all HTTP methods
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Allow specific headers
  next();
});
