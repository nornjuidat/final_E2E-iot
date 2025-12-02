class Esp {
    constructor (db){
        this.db = db ;
    }
   async createAvgsensor(name,avg,potId){
        let sql = "INSERT INTO SENSORS (sensorname,val_avg,date,pot_id)VALUES(?,?,?,?);"
         await this.db.execute(sql,[name,avg,new Date().toLocaleDateString("he-IL"),potId])

    }
}

module.exports = Esp;