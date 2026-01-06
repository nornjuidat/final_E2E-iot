const router = require("express").Router();

const {createAVGsensors,readAvgDate2,readAvgPot,deleteAvgSensor} = require('../controllers/esp');

router.post('/create',createAVGsensors);
router.get('/read',readAvgDate2);
router.get('/pot',readAvgPot);
router.delete('/delete',deleteAvgSensor);

module.exports = router;