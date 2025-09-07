import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

console.log("Server started... trying to run")

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export default app;