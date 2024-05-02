const express = require('express');
const router = express.Router();
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const multer = require('multer');
const upload = multer({ dest : 'after-section-06/public/img/users'});

router.route('/signup').post(authController.signup);
router.post('/login', authController.login);
router.get('/logOut', authController.logout);
router.post('/forgotpassword' , authController.forgotpassword);
router.patch('/resetpassword/:token' , authController.resetpassword);

// Protect all routes after this middleware
router.use(authController.protect);

router.patch('/updateMyPassword' , authController.updatePassword)
router.patch('/updateMe' , userController.uploadImage , userController.resizeUserImage, userController.updateMe);
router.delete('/deleteMe' , userController.deleteMe);

router.get('/me', userController.getMe , userController.getUser);

router.use(authController.restrictTo('admin'));

router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);

router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;