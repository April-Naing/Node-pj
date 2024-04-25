const User = require('./../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');

const filterObj = (obj, ...allowedFields) => {
    let newObj = {} ;
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) newObj[el] = obj[el] ;
    })

    return newObj ;
}

exports.getMe = (req, res, next) => {
    req.params.id  = req.user.id ;
    next();
}

exports.getAllUsers = factory.getAll(User);

exports.updateMe =catchAsync(async (req, res, next) => {
    // 1)Create error if user posts password
    if(req.body.password || req.body.passwordConfirm){
        return next(new AppError('This route is not for password update.Please use /updatePassword.') , 400)
    }

    // 2)Filtered out unwanted fields name : 
    const filteredBody = filterObj(req.body , 'name' , 'email');

    // 3)Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id , filteredBody , {
        runValidators : true ,
        new : true
    });


    res.status(200).json({
        status : 'success' ,
        data : {
            user : updatedUser 
        }

    })
});

exports.deleteMe = catchAsync( async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id , {active : false});

    res.status(204).json({
       status : 'success' ,
       data : null 
    });
});

exports.getUser = factory.getOne(User);

exports.createUser = factory.createOne(User);

exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);