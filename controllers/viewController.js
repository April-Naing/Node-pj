const express = require('express');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel')

exports.getOverview =catchAsync(async (req, res, next) => {
    // 1)Get data from collection
    const tours = await Tour.find();
    // 2)Build Template
    // 3)Render that template using tour data from 1
    res.status(200).render('overview' , {
        title : 'All Tours' ,
        tours
    });
});

exports.getTours = catchAsync( async(req, res, next) => {
    const tour = await Tour.find({
        slug : req.params.slug
    }).populate({
        path : 'reviews',
        fields: 'review rating user'
    });


    if(!tour){ 
        return next (new AppError('Please fill email and password' , 400));
    }

    res.status(200).render('tour' , {
        title : `${tour[0].name} Tour` ,
        tour
    });

});

exports.getLoginForm = (req, res) => {
    res.status(200).render('login',{
        title : 'Log into your account'
    });
};

exports.getAccount = (req, res) => {
    res.status(200).render('account' , {
        title : 'Your Account'
    })
}

exports.updateUserData = catchAsync(async (req, res, next) => {
    const updateUser = await User.findByIdAndUpdate(req.user.id , {
        name : req.body.name ,
        email : req.body.email
    },
    {
        new : true ,
        runValidators : true
    }
    );

    console.log(updateUser)

    res.status(200).render('account' , {
        title : 'Your Account' ,
        user : updateUser
    })

});