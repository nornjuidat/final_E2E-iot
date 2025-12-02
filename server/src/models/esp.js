class Esp {
    constructor (db){
        this.db = db ;
    }
    createAvgsensor(name,avg,potId){
        let sql = "INSERT INTO SENSORS (sensorname,val_avg,date,pot_id)VALUES(?,?,?,?)"
    }
}

module.exports = Esp;