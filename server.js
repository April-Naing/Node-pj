//4)START SERVER
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config(); 

const app = require('./app'); 
 
const DB = process.env.DATABASE.replace('<PASSWORD>',process.env.DATABASE_PASSWORD);

process.on('uncaughtException' , err => {
    console.log('UNCAUGHT EXCEPTION!');
    console.log(err.name , err.message);

    process.exit(1);
})



mongoose.
// connect(process.env.DATABASE_LOCAL, {
    connect(DB,{
    useNewUrlParser: true ,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify:false
}).then(() => 
    console.log('DB connection successful'));
    // .catch(err => console.log('Error') );
// console.log(process.env);   


const port = process.env.PORT || 3000 ;

const server = app.listen(port , () => {
    console.log(`app running on port ${port}...`);
}); 

process.on('unhandledRejection' , err  => {
    console.log(err.name , err.message) ; 
    console.log('UNHANDLER REJECTION! Shutting down...')
    server.close(() => {
        process.exit(1);
    })
});









