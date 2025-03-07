import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGOURI;

export const dbconnect = async ()=>{
    try {
        mongoose.connect(mongoUri,{});
        console.log('succesfully connected');
    } catch (err) {
        console.error('Error connecting to the database', err);
    }
}