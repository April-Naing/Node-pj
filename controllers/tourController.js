const exp = require('constants');
// const APIFeatures = require('./../utils/apiFeatures');

const Tour = require('./../models/tourModel');
const AppError = require('../utils/appError');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const sharp = require('sharp');
const multer = require('multer');

const multerStorage = multer.memoryStorage() ;

const multerFilter = (req , file , cb) => {
    if(file.mimetype.startsWith('image')){
        cb(null , true)
    }else{
        cb(new AppError('Not an image.Please upload only images!'))
    }
}
const upload = multer ({
    storage : multerStorage ,
    fileFilter : multerFilter
});

exports.updateTourImages = upload.fields([
    {name : 'imageCover' , maxCount : 1} ,
    {name : 'images' , maxCount : 3}
])

exports.resizeTourImage = catchAsync(async(req , res, next) => {
    console.log(req.files);

    // 1) Image Cover
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.files.imageCover[0].buffer)
            .resize(2000, 1333)
            .toFormat('jpeg')
            .jpeg({quality : 90})
            .toFile(`after-section-06/public/img/tours/${req.body.imageCover}`);

    // 2) Images
    req.body.images = [];

    await Promise.all(
        req.files.images.map(async (file , i) => {
            const fileName = `tour-${req.params.id}-${Date.now()}-${ i + 1}.jpeg`
            await sharp(file.buffer)
                    .resize(2000,1333)
                    .toFormat('jpeg')
                    .jpeg({ quality: 90})
                    .toFile(`after-section-06/public/img/tours/${fileName}`);
        
            req.body.images.push(fileName)
        })
    );

    console.log(req.body.images);
    next();
});

exports.aliasTopTours = async( req, res, next) => {
    req.query.limit = '5' ;
    req.query.sort = 'sort=-ratingsAverage,price'
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty'

    next();
}

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour , { path : 'reviews'}) ;

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

// exports.deleteTour = catchAsync(async(req , res , next) => {
    
//     const tour = await Tour.findByIdAndDelete(req.params.id)

//     if(!tour){
//         return next(new AppError('No tour found with that id', 404));
//     }

//     res.status(204).json({
//         status: 'success' ,
//         data : null
//     });
// });

exports.createTour = factory.createOne(Tour);

exports.getTourStats = catchAsync(async(req,  res , next)=>{
    
    const stats =await Tour.aggregate([
        {
            $match : { ratingsAverage : { $gte : 4.5}}
        },
        { 
            $group: {
                _id : {$toUpper : '$difficulty'},
                num : {$sum : 1 },
                numRating : { $sum : '$ratingQuantity'},
                avgRating : { $avg: '$ratingsAverage' },
                avgPrice : { $avg : '$price'},
                minPrice : { $min : '$price'},
                maxPrice : { $max : '$price'}
            },
        },
        {
            $sort : { avgPrice : 1}
        },
        // {
        //     $match : { _id : {$ne : 'EASY'}}
        // }

    ]);

    res.status(200).json({
        status : 'Success' ,
        data :{
            stats  
        }
        
    });      
});

exports.getMonthlyPlan = catchAsync(async (req, res,next)  => {
    
    const year = req.params.year * 1 ;

        const plan = await Tour.aggregate([
            {
                $unwind : '$startDates'
            },
            {
                $match : {
                    startDates : {
                        $gte : new Date(`${year}-01-01`),
                        $lte : new Date(`${year}-12-31`),
                    }
                }
            },
            {
                $group : {
                    _id : {$month : '$startDates'},
                    numTourStarts : {$sum : 1},
                    tours : { $push : '$name'}
                }
            },
            {
                $addFields : { month : '$_id' }
            },
            {
                $project : {
                    _id : 0
                }
            },
            {
                $sort : { numTourStarts : -1 }
            },
            {
                $limit : 6
            }
        ]);

        res.status(200).json({
            status : 'success' ,
            data : {
                plan
            }
        });
});

// tours-distance?distance=233&center=-40,45&unit=mi
exports.getToursWithin = catchAsync( async(req , res, next) => {
    const { distance , latlng , unit } = req.params ;
    const [lat,lng ] = latlng.split(',');

    const radius = unit === 'mi' ? distance / 3963.2  : distance / 6378.1 ;

     if(!lat || !lng ){
        next(new AppError('Please provide latitude and langitude in the format lat and lng') , 400);
    }

    const tours = await Tour.find({
        startLocation :{ $geoWithin : { $centerSphere : [[lng , lat] , radius ]}}
    });

    console.log(distance , lat ,lng , unit);
    
    res.status(200).json({
        status : 'success',
        results : tours.length ,
        data : {
            data : tours
        }
    });
});

exports.getDistances = catchAsync(async (req, res, next) => {
    const {latlng , unit} = req.params ;
    const [lat , lng ] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001 ;
    
    if(!lat || !lng){
        next(new AppError('Please provide latitude and langitude in the fornat lat and lng') , 400)
    }

    const distances = await Tour.aggregate([
       {
            $geoNear : {
                near : {
                    type : 'point' ,
                    coordinates : [lng * 1 , lat * 1]
                },
                distanceField : 'distance'
            }
        },
        {
            $project : {
                distance : 1 ,
                name : 1 ,
                distanceMultiplier : multiplier 
            }
        }
        
    ]);

    res.status(200).json({
        status : 'success' ,
        data : {
            data : distances
        }
    });
});