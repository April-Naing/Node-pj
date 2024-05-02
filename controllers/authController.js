const {promisify} = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('./../utils/email');
const crypto = require('crypto');

const signToken = id => {
    return jwt.sign({ id } , 'process.env.JWT_SECRET' , {
        expiresIn : process.env.JWT_EXPIRES_IN 
    });
}

const createSendToken = (user , statusCode , res) => {
    const token = signToken(user._id)

    const cookieOptions = {
        expires : new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000) ,
        httpOnly : true
    };

    if( process.env.NODE_ENV === 'production') cookieOptions.secure = true ;

    res.cookie('jwt' , token , cookieOptions )

    // Remove password from output
    user.password = undefined ;
    
    // console.log(newUser);
    res.status(statusCode).json({
        status : 'success' ,
        token,
        data : {
            user 
        }
    });   
}

exports.signup = catchAsync(async (req , res , next) => {
    const newUser = await User.create(req.body
        // {
        // name : req.body.name ,
        // email : req.body.email ,
        // password : req.body.password,
        // passwordConfirm : req.body.passwordConfirm
        // }  
    );
    const url = `${req.protocol}://${req.get('host')}/me`;
    console.log(url)
    new Email(newUser , url).sendWelcome();

    createSendToken( newUser , 201, res);

});


exports.login = catchAsync(async(req , res, next) => {
    const {email , password} = req.body ;

    // 1)Check if email and password exist
    if(!email || !password){
        return next (new AppError('Please fill email and password' , 400));
    }
    
    // 2)check if user exist && password is correct
    const user = await User.findOne({email}).select('+password');

    // const correct = await  user.correctPassword(password , user.password);
    console.log(password , user.password)
    console.log(await user.correctPassword(password , user.password))

        // if(!user){
        // return next(new AppError('Incorrect email or password' , 401))
        // }
    
    // 3)If everything ok,send token to client
    createSendToken(user, 200 , res);

});

exports.logout = (req, res) => {
    res.cookie('jwt' , 'loggedOut' , {
        expires : new Date(Date.now() + 10 * 1000),
        httpOnly : true
    });

    res.status(200).json({status : 'success'});
}

exports.protect = catchAsync( async( req, res, next) => {
    //1) Getting token and check out if it's there
    let token;
    if( req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    }else if(req.cookies.jwt){
        token = req.cookies.jwt
    }

    if(!token){
        return next( new AppError('You are not logged in!Please log in to get access.' , 401));
    }
    // 2)Verification token
    const decoded = await promisify(jwt.verify)(token,'process.env.JWT_SECRET')

    // 3)Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if(!currentUser){
        return next(new AppError('The user belonging to this token no longer exist!' , 401))
    }

    // 4)Check if user changed password after the token was issued
    if(currentUser.changePasswordAfter(decoded.iat)){
        return next(new AppError('User recently changed password!Please log in again'),401);
    };

    // Grabt Acess to protected route
    req.user = currentUser ;
    res.locals.user = currentUser;

    next();
});

// Only for rendered pages,no error
exports.isLoggedIn = async( req, res, next) => {
    
    if(req.cookies.jwt){
        try{// 1)verify the token
            const decoded = await promisify(jwt.verify)(req.cookies.jwt,'process.env.JWT_SECRET')

            // 2)Check if user still exists
            const currentUser = await User.findById(decoded.id);
            if(!currentUser){
                return next()
            }

            // 3)Check if user changed password after the token was issued
            if(currentUser.changePasswordAfter(decoded.iat)){
                return next();
            };

            // There is a logged in user
            res.locals.user = currentUser;
            return next();
        }catch(err){
            return next()
        }
    }   
    next();
};

exports.restrictTo = (...roles) => {
    return (req, res, next) =>{

        if(!roles.includes(req.user.role)){
            return next(new AppError('You do not have permission to perform this action' , 403));
        };

        next();
    };
};

exports.forgotpassword = catchAsync (async (req, res, next) => {
    // 1)Get user based on posted email
    const user = await User.findOne({email : req.body.email})

    if(!user){
        return next(new AppError('There is no user with email password' , 404));
    }
 
    // 2)Generate the random token
    const resetToken = user.createPasswordResetToken(); 
    await user.save({ validateBeforeSave : false });
 
    // 3)send it back as a email
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetpassword/${resetToken}`;

    try{
        // await sendEmail({
        //     email : user.email ,
        //     subject : 'Your password reset token(valid for 10 min)' ,
        //     message
        // }); 

        new Email(user , resetURL).sendPasswordReset();
        
        res.status(200).json({ 
            status : 'success',
            message : 'Token send to email!'
        });
    }catch(err){
        user.createPasswordResetToken = undefined ;
        user.passwordResetExpired = undefined ;

        await user.save({ validateBeforeSave : false });

        console.log(err)
 
        return next(new AppError('There was an error sending the email!Try again later' ), 500)
    };
});


exports.resetpassword =catchAsync(async(req,res, next) => {
    // 1)Get user based on token
    const hashedToken = crypto.createHash('sha256')
                              .update(req.params.token)
                              .digest('hex');

    const user = await User.findOne({ 
        passwordRestToken : hashedToken , 
        passwordResetExpired: { $gt: Date.now()} });

    console.log(user);
    // 2)If token has not expired, and there is user, set the new password
    if(!user){
        return next(new AppError('Token is invalid or has expired') , 400);
    }

    user.password = req.body.password ;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken =  undefined ;
    user.passwordResetExpired = undefined ;
    await user.save();

    // 3)Update changedPasswordAt property for  the current user

    // 4)Log the user in,send JWT 
    createSendToken(user , 200 , res);

});

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1) Get User from collection
    const user =  await User.findById(req.user.id).select('+password')
    
    console.log(req.body.passwordCurrent, user.password , user.passwordConfirm , req.body.password) ;
    // 2)Check if posted current password is correct

    // also need to recover like login
    console.log(await user.correctPassword(req.body.passwordCurrent , user.password))
    if(!(await user.correctPassword(req.body.passwordCurrent , user.password))){
        return next(new AppError('Your current password is wrong'), 401)
    } 


    // 3) If so , update password
    user.password = req.body.password ;
    user.passwordConfirm = req.body.passwordConfirm ;
    await user.save();

    // 4) Log user in , send JWT
    createSendToken( user , 200 , res );

});