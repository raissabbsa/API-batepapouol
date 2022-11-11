import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {MongoClient} from "mongodb"
import joi from "joi"
import dayjs from "dayjs";
dotenv.config();

const server = express();
server.use(cors());
server.use(json());
const mongoClient = new MongoClient("mongodb://localhost:27017")
let db;

mongoClient.connect().then(() => {
  db= mongoClient.db("batePapoUol")
})

const userSchema = joi.object({
    name: joi.string().required()
  });

server.post("/participants", async (req, res) => {
    const {name} = req.body
    const validation = userSchema.validate({name}, { abortEarly: true })

    if (validation.error) {
        const err = validation.error.details.map(detail => detail.message)
        res.status(402).send(err)
        return
    }

    const listUsers = await db.collection("initParticipant").find().toArray()
    const userFound = listUsers.find(user => user.name ===name)
    if(userFound){
        res.sendStatus(409)
        return
    }
    try{
        const names = await db.collection("initParticipant").insertOne({
            name: name,
            lastStatus: Date.now()
        })
        await db.collection("message").insertOne({
            name,
            to: "todos",
            text: "entrando na sala...",
            type: "status",
            time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`
        })
        res.sendStatus(201)

    } catch(err) {
        console.log(err)
    }
    
})

server.get('/participants', async(req, res) => {

    try{
        const contacts = await db.collection("initParticipant").find().toArray()
        res.send(contacts)
    } catch(err) {
    console.log(err)
  }
});

server.get("/messages", async(req,res) => {
    const limit = parseInt(req.query.limit)
    const messages = await db.collection("message").find().toArray()
    if(limit){
        const lastMessages = messages.slice(-limit)
        res.send(lastMessages)
    }
    else{
        res.send(messages)
    }
})


server.listen(5000, () => {
  console.log("Rodando em http://localhost:5000");
});