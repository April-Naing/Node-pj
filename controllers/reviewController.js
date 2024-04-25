const Review = require('./../models/reviewModel');
const catchAsync = require('./../utils/catchAsync');
const express = require('express');
const factory = require('./handlerFactory');

exports.getAllReviews = factory.getAll(Review);

exports.setTourId = async(req, res, next) => {
    // Allow nested routes
    if(!req.body.tour) req.body.tour = req.params.tourId;
    if(!req.body.name) req.body.user = req.user.id;

    next();
}

exports.getReview = factory.getOne(Review)

exports.createReview = factory.createOne(Review);

exports.updateReview = factory.updateOne(Review);
exports.deleteReview  = factory.deleteOne(Review);

// let filter =  {}
// if(req.params.tourId) filter = {tour : req.params.tourId}