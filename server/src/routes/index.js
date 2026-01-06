const router = require("express").Router();

router.use("/esp", require("./esp"));

module.exports = router;