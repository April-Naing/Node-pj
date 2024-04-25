const mongoose = require('mongoose');
const crypto = require('crypto');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name : {
        type : String ,
        required : [ true , 'Please tell us your name']
    } ,
    email : {
        type : String,
        required : [true , 'Please provide your email'] ,
        unique : true ,
        lowercase : true,
        validate : [ validator.isEmail , 'Please provide a valid email']
    },
    photo : String ,
    role : {
        type : String ,
        enum : ['user' , 'guide' , 'lead-guide' , 'admin'],
        default : 'user'
    },
    password : {
        type : String ,
        required : [true , 'Please provide your password'],
        minlength : 8,
        select : false
    },
    passwordChangedAt : Date,
    passwordConfirm : {
        type : String ,
        required : [ true , 'Please confirm password'],
        validate : {
            //This only work on save
            validator : function(el){
                return el === this.password;
            }
            ,
            message : 'Passwords are not the same'
        }
    },
    passwordRestToken : String ,
    passwordResetExpired : Date,
    active : {
        type : Boolean ,
        default : true ,
        select : false
    }
});

// userSchema.pre('save', async function(next){
//     // Only run this function if pw was actually modified
//     if(!this.isModified('password')) return next();

//     // hash pw 
//     this.password = await bcrypt.hash(this.password , 12);

//     //delete pw confirm
//     this.passwordConfirm = undefined ;
//     next();
// });
userSchema.index({ price : 1});

userSchema.pre(/^find/ , function (next){
    // this point to the current query
    this.find({active : {$ne : false } });
    next();
});

userSchema.methods.correctPassword = async function( candidatePassword , userPassword){
    return await bcrypt.compare(candidatePassword , userPassword);
};

userSchema.methods.changePasswordAfter = function( JWTTimestamp ){
    // console.log('This is from passwordchanged')
    if(this.passwordChangedAt){
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000 , 10);
        // console.log(changedTimeStamp , JWTTimestamp);
        return JWTTimestamp < changedTimeStamp ; //100 < 200
    }

    // False meansn not change password
    return false ;
}

userSchema.methods.createPasswordResetToken = function(){

    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordRestToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    console.log({resetToken }, this.passwordRestToken)

    this.passwordResetExpired = Date.now() + 10 * 60 * 1000 ;

    return resetToken ;
};

const User = mongoose.model('User' , userSchema);

module.exports = User ;