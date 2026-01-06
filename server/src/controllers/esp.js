const pool = require('../models/db');
const Esp = require('../models/esp');

const esp = new Esp(pool);

const sensors = [
    {name:"temp",val:[200,1000,555,345]},{},{}
];

const createAVGsensors = async (req,res) => {
    try{
        const {name,val,id_pot}=req.body; // שומר את הבדיקות בבסיס הנתונים. אם היינו שומרים בשרת והשרת היה נופל אז היינו מאבדים את הבדיקות
        if((name!="temp" && val<=0) || (name=="" || id_pot<0)){
            return res.status(401).json({message:"one or more of the parameters are missing or wrong."});
        }
        let data = await esp.createAvgSensorQu(name,val,id_pot);
        console.log(data);
        return(res.status(201).json({message:"the check has been saved successfully."}));
    } catch (error){
        console.log(error);
    }
}

const readAvgDate = async (req,res) => {
    try{
        const {name,date}=req.body;
        //SELECT AVG(Price)
        let data = await esp.readAvgDateQu(name,date); // לא טוב כי אמור להיות רק date בלי name
        console.log(data);
        return(res.status(201).json(data));
    } catch (error){
        console.log(error);
    }
}

const readAvgDate2 = async (req, res) => {
    try {
        const { name, date } = req.body;
        if (!name || !date) {
            return res.status(400).json({
                message: "name and date are required"
            });
        }
        const result = await esp.readAvgByNameAndDate(name, date);
        if (!result || result.total_samples === 0) {
            return res.status(404).json({
                message: "No samples found for this date"
            });
        }
        return res.status(200).json({
            name,
            date,
            avg: Number(result.avg_value.toFixed(2)),
            samples: result.total_samples
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

const readAvgPot = async (req,res) => {
    try{
        const {name,val,id_pot}=req.body; // שומר את הבדיקות בבסיס הנתונים. אם היינו שומרים בשרת והשרת היה נופל אז היינו מאבדים את הבדיקות
        if((name!="temp" && val<=0) || (name=="" || id_pot<0)){
            return res.status(401).json({message:"one or more of the parameters are missing or wrong."});
        }
        let data = await esp.readAvgPotQu(id_pot);
        console.log(data);
        return(res.status(201).json({message:"the check has been saved successfully."}));
    } catch (error){
        console.log(error);
    }
}

const deleteAvgSensor = async (req,res) => {
    try{
        const {id_pot}=req.body; // שומר את הבדיקות בבסיס הנתונים. אם היינו שומרים בשרת והשרת היה נופל אז היינו מאבדים את הבדיקות
        if(!id_pot || id_pot <= 0){
            return res.status(400).json({message:"pot does not exist"});
        }
        /*let data = await esp.deleteAvgPotQu(id_pot);
        if (data.affectedRows === 0) {
            return res.status(404).json({ message: "pot not found" });
        }*/
        let [result] = await esp.deleteAvgPotQu(id_pot);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "pot not found" });
        }
        console.log(data);
        return(res.status(200).json({message:"the pot has been removes successfully."}));
    } catch (error){
        console.log(error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = {createAVGsensors,readAvgDate2,readAvgPot,deleteAvgSensor,}