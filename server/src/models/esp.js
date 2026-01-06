class Esp{
    constructor(db){
        this.db = db;
    }
    async createAvgSensorQu(name, avg, potId){
        let sql = "INSERT INTO sensors (sensor_name, val_avg, date, pot_id) VALUES (?,?,?,?);"//הגנה מאינג'קשן בעזרת סימני שאלה
        return await this.db.execute(sql,[name,avg,new Date().toLocaleDateString("he-IL"),potId]);
    }
    async readAvgSensorQu(name){
        let sql = "SELECT * FROM sensors WHERE sensor_name = ?;";
        return await this.db.execute(sql, [name]);
    }
    async readAvgDateQu(date){///////////////////////////////////////
        let sql = "SELECT * FROM sensors WHERE date = ?;";
        return await this.db.execute(sql, [date]);
    }
    async readAvgDateQu2(name, date){/////////////////////////////////////
        let sql = "SELECT AVG(value) AS avg FROM samples WHERE name = ? AND DATE(sample_date) = ?";
        let [rows] = await this.db.execute(sql, [name, date]);
        return rows[0]; // מחזיר ממוצע אחד
    };
    async readAvgByNameAndDate(name, date) {
    const sql = "SELECT AVG(value) AS avg_value, COUNT(*) AS total_samples FROM samples WHERE name = ? AND DATE(sample_date) = ?";
    const [rows] = await this.db.execute(sql, [name, date]);
    return rows[0]; // מחזיר ממוצע + כמות בדיקות
}

    async readAvgPotQu(potId){
        let sql = "SELECT * FROM sensors WHERE  pot_id = ?;";
        return await this.db.execute(sql, [potId]);
    }
    async deleteAvgSensorQu(id){
        let sql = "DELETE FROM sensors WHERE sensor_id = ?;";
        return await this.db.execute(sql, [id]);
    }
        async deleteAvgPotQu(id){
        let sql = "DELETE FROM pots WHERE pot_id = ?;";
        return await this.db.execute(sql, [id]);
    }
}

module.exports = Esp;