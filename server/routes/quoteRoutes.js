const express = require("express");
const router = express.Router();
const QuoteController = require("../controllers/QuoteController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/api/quote", authMiddleware, QuoteController.getQuote);
router.post("/api/quote", authMiddleware, QuoteController.updateQuote);

module.exports = router;
