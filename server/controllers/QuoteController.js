const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

exports.getQuote = async (req, res, next) => {
  const authToken = req.cookies.xaccesstoken;

  if (!authToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const email = decoded.email;
    const user = await User.findOne({ email: email });
    console.log(user);

    if (inOtherRoute === true) {
      res.cookie(authToken, { expires: Date.now(0) });
      res.clearCookie(authToken, { path: "/" });
      return res.json({ status: "expired" });
    } else {
      return res.json({ status: "ok", quote: user.quote });
    }
  } catch (error) {
    next(error);
    res.json({ status: "error", error: "invalid token" });
  }
};

exports.updateQuote = async (req, res, next) => {
  const authToken = req.cookies.xaccesstoken;
  if (!authToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(authToken, "secrete123");
    const email = decoded.email;
    await User.updateOne({ email: email }, { $set: { quote: req.body.quote } });
    if (inOtherRoute === true) {
      res.cookie(authToken, { expires: Date.now(0) });
      res.clearCookie(authToken, { path: "/" });
      return res.json({ status: "expired" });
    }
    return res.json({ status: "ok" });
  } catch (error) {
    next(error);
    res.json({ status: "error", error: "invalid token" });
  }
};
