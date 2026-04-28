//src/config/mongodb.js

const mongoose = require ('mongoose');


async function connectMongoDB(){
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
    } catch(err){
                console.error('MongoDB connection failed — exiting');
        console.error(err);

        process.exit(1); //creash fast if db is unavailable
    }
}

module.exports = connectMongoDB;