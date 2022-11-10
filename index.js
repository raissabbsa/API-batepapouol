import express from "express"
import cors from "cors"
import {MongoClient} from "mongodb"
import dotenv from "dotenv"
dotenv.config()

const mongoClient = new MongoClient(process.env.MONGO_URI)

try{
    await mongoClient.connect()
    console.log("MongoDB conectado")
} catch(err) {
    console.log(err)
}
const db = mongoClient.db("batePapoUol")

const app = express()
app.use(express.json())
app.use(cors)

console.log(promise)

app.get("/participants", (req,res) => {

})
app.listen(5000, () => {
    console.log(`Server running in port: ${5000}`);
  })