import express, { json } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from "mongodb"
import joi from "joi"
import dayjs from "dayjs";
dotenv.config();

const server = express();
server.use(cors());
server.use(json());
const mongoClient = new MongoClient(process.env.MONGO_URI)
let db;

try {
    await mongoClient.connect()
    db = mongoClient.db("batePapoUol")
} catch (err) {
    console.log(err)
}

const userSchema = joi.object({
    name: joi.string().required()
});
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
});
const time = `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`


server.post("/participants", async (req, res) => {
    const { name } = req.body
    const validation = userSchema.validate({ name }, { abortEarly: true })

    if (validation.error) {
        const err = validation.error.details.map(detail => detail.message)
        res.status(402).send(err)
        return
    }
    try {
        const listUsers = await db.collection("initParticipant").find().toArray()
        const userFound = listUsers.find(user => user.name === name)
        if (userFound) {
            res.sendStatus(409)
            return
        }
        await db.collection("initParticipant").insertOne({
            name: name,
            lastStatus: Date.now()
        })
        await db.collection("message").insertOne({
            from: name,
            to: "Todos",
            text: "entrando na sala...",
            type: "status",
            time
        })
        res.sendStatus(201)

    } catch (err) {
        console.log(err)
    }

})

server.get('/participants', async (req, res) => {

    try {
        const contacts = await db.collection("initParticipant").find().toArray()
        res.send(contacts)
    } catch (err) {
        console.log(err)
    }
});

server.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit)
    const user = req.headers.user
    try {
        const messages = await db.collection("message").find({ $or: [{ to: user }, { from: user }, { to: "Todos" }] }).toArray()

        if (limit) {
            const lastMessages = messages.slice(-limit)
            res.send(lastMessages)
        }
        else {
            res.send(messages)
        }
    } catch (err) {
        console.log(err)
    }

})

server.post("/messages", async (req, res) => {
    const { to, text, type } = req.body
    const from = req.headers.user;

    const validation = messageSchema.validate({ to, text, type }, { abortEarly: false })

    try {
        const isParticipant = await db.collection("initParticipant").findOne({ name: from })

        if (validation.error || !isParticipant) {
            res.sendStatus(422)
            return
        }
        await db.collection("message").insertOne({ from, to, text, type, time })
        res.sendStatus(201)
    } catch (err) {
        console.log(err)
    }

})
server.post("/status", async (req, res) => {
    const user = req.headers.user
    try {
        const isOnline = await db.collection("initParticipant").findOne({ name: user })
        if (isOnline) {
            await db.collection("initParticipant").
                updateOne(
                    { _id: isOnline._id },
                    { $set: { ...isOnline, lastStatus: Date.now() } })
            res.sendStatus(200)
        }
        else {
            res.sendStatus(404)
        }
    } catch (err) {
        console.log(err)
    }

})

setInterval(async () => {
    try {
        const users = await db.collection("initParticipant").find({}).toArray()
        users.map(async (u) => {
            const now = Date.now()
            if (now - u.lastStatus > 10000) {
                await db.collection("initParticipant").deleteOne({ name: u.name })
                await db.collection("message")
                    .insertOne(
                        { from: u.name, to: "Todos", text: "sai da sala...", type: "status", time})
            }
        })
    } catch (err) {
        console.log(err)
    }
}, 15000)

server.listen(5000, () => {
    console.log("Rodando em http://localhost:5000");
});