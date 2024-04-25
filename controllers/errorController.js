const AppError = require('./../utils/appError');

const handleCastErrorDB = err => {
    const message = `Invaild ${err.path} : ${err.value}.`
    return new AppError(message , 400)
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map( el => el.message);
    const message = `Invalid input data.${errors.join('. ')}`;

    return new AppError(message,400)
}

const handleJWTError = () => new AppError('Invalid token!Please log in again.' , 401) ;

const handleJWTExpireError = () => new AppError('Token has expired! Please log in again.' , 401);

const sendErrProd = (err ,req, res) => {
    //A) API
    if(req.originalUrl.startsWith('/api')){
        //A)Operational , trusted error:send message to client
        if(err.isOperational){
            return res.status(err.statusCode).json({
                status : err.status ,
                message : err.message 
            });
        }
        // Programming or other unknown error:don't leak error details
        // 1)Log error
        console.log('Error!!' , err)

        // 2)send generic message
        return res.status(500).json({
            status : 'error' ,
            message : 'Something went very wrong',
        });
    }
    // B) Rendered Website
    //A)Operational , trusted error:send message to client
    if(err.isOperational){
        return res.status(err.statusCode).render('error' , {
            title : 'Something went wrong!',
            msg : messsage
        });

    }
    // Programming or other unknown error:don't leak error details
    // 1)Log error
    console.log('Error!!' , err)

    // 2)send generic message
    return res.status(err.statusCode).render('error' , {
        title : 'Something went wrong!',
        msg : 'Please Try Again Later.'
    });
        
    
};

const sendErrDev = (err ,req ,res) => {
    //A) API
    if(req.originalUrl.startsWith('/api')){
        res.status(err.statusCode).json({
            status : err.status ,
            error : err ,
            message : err.message,
            stack : err.stack 
        });
    }
        
    //B) Render website
    console.log('ERROR!' , err);
    return res.status(err.statusCode).render('error' , {
        title : 'Something went wrong!',
        msg : err.message
    });
};

module.exports = (err,req,res,next) => {
    console.log(err.stack);
    err.statusCode = err.statusCode || 500 ;
    err.status = err.status || 'error' ;

    if(process.env.NODE_ENV === 'production'){
        // let error = { ...err};
        // console.log(err.code)
        
        if( err.name === 'CastError') err = handleCastErrorDB(err);
        if(err.name === 'ValidationError') err = handleValidationErrorDB(err);
        console.log(err.name)
        if(err.name === 'JsonWebTokenError') err=handleJWTError();
        if(err.name === 'TokenExpiredError') err=handleJWTExpireError();

        sendErrProd(err ,req , res);
        

    }else if(process.env.NODE_ENV === 'development'){
        sendErrDev(err,req, res);
    }
};