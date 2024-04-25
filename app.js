const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const app = express();
const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require ('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const viewRouter = require('./routes/viewRoute');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const reviewRouter = require('./routes/reviewRoute');
// 1)Global Middleware
// Security HTTp header
app.use(helmet());

app.set('view engine','pug');
app.set('views' , path.join(__dirname , 'views'));

// app.get('/' , path.join(__dirname , 'view'))

// Development blocking
if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}

// Limit req from same api
// const limiter = rateLimit({
//     max : 100 ,
//     windowMs : 60 * 60 * 1000 ,
//     message : 'Too many requests from this IP, please try again in an hour'
// });
// app.use(limiter);

// Body parser, reading data from the body into req.body
app.use(express.json({ limit : '10kb' }));
app.use(express.urlencoded({ extended : true , limit : '10kb'}))
app.use(cookieParser());

// Data sanitization against Nosql query injection
app.use(mongoSanitize());

// Data sanitization against xss
app.use(xss());

// prevent parameter prevention
app.use(hpp({
    whitelist : [
        'duration' , 
        'difficulty' , 
        'ratingsAverage' ,
        'ratingQuantity' ,
        'maxGroupSize' ,
        'price'
    ]
}));

// serving static files
// app.use(express.static(`${__dirname}/after-section-06/public`));
app.use(express.static(path.join(__dirname ,'after-section-06/public')));

app.use((req , res , next) => {
    req.requestTime = new Date().toISOString;
    // console.log(req.cookies);
    next();
})


// error for axios 
// app.use(
//     helmet.contentSecurityPolicy({
//       directives: {
//         defaultSrc: ["'self'", 'data:', 'blob:'],
   
//         fontSrc: ["'self'", 'https:', 'data:'],
  
//         scriptSrc: ["'self'", 'unsafe-inline'],
   
//         scriptSrc: ["'self'", 'https://*.cloudflare.com'],
   
//         scriptSrcElem: ["'self'",'https:', 'https://*.cloudflare.com'],
   
//         styleSrc: ["'self'", 'https:', 'unsafe-inline'],
   
//         connectSrc: ["'self'", 'data', 'https://*.cloudflare.com']
//       },
//     })
//   );


//2) Route Handlers

// app.get('/api/v1/tours', getAllTours );
// app.get('/api/v1/tours/:id', getTour );
// app.post('/api/v1/tours' , createTour );
// app.patch('/api/v1/tours/:id' , updateTour);
// app.delete('/api/v1/tours/:id' , deleteTour );

//3) Routes
// app.use((req , res , next) => {
//     console.log("Hello from the middleware !");
//     next();
// })

app.use('/',viewRouter)
app.use('/api/v1/tours' , tourRouter)
app.use('/api/v1/users' , userRouter)
app.use('/api/v1/reviews' , reviewRouter)
app.all('*' , (req, res, next) => {
    // res.status(404).json({
    //     status : 'fail' ,
    //     message : `Can't find ${req.originalUrl} on this server`
    // })

    // const err = new Error(`Can't find ${req.originalUrl} on this server`);
    // err.status = 'fail' ;
    // err.statusCode = 404 ;
    
    next(new AppError(`Can't find ${req.originalUrl} on this server` , 404));
});
 
app.use(globalErrorHandler);

module.exports = app ;
// app.get('/',(req , res) =>{
//     res
//     .status(404)
//     .json({message : 'Hello from the server side' , app : 'Natours'});
// })

// app.post('/' , (req , res) => {
//     res.send('You can post this endpoint')
// })

