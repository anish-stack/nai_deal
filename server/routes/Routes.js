const express = require('express');
const { createPartner, verifyOtpAndEmail, resendAccountVerifyOtp, resendForgetPasswordOtp, login, logout, verifyForgetPasswordOtp, deletePartnerAccount, forgetPasswordRequest, GetAllShopListByPartner, getAllPartner, GetAllShopListByPartnerAdmin, updateIsShow, updateIsBlock } = require('../controllers/Partnercontroller');
const { UpdateListing, getPostByCategory, UpdateListingAdmin, UpdateListingByBolt } = require('../controllers/ListingControllers');
const { ListUser, LoginListUser, MyShopDetails, CreatePost, getAllPost, getPostById, deletePostById, deleteAllPost, getMyPostOnly, SearchByPinCodeCityAndWhatYouWant, getAllShops, DeleteListUser, updateDetailsOfListUser, paymentVerification, showPaymentDetails, allPayments, CreateForgetPasswordRequest, verifyOtp, getAllPostApprovedPost, UploadProfileImage, UpdateProfileDetails, getMyAllPost, updateShopAddress, getSingleListingUser, getAllPostApprovedPostByAddress, updatePackageInUser, getListingByUserName, updateStatusOfShowingNumber, updateStatusOfShowingEmail } = require('../controllers/Listinguser.controller');
const { protect } = require('../middlewares/Protect');
const multer = require('multer');
const { getUnApprovedPosts, MakeAPostApproved, getDashboardData } = require('../controllers/Shop');
const { createPackage, getAllPackages, updatePackage, deletePackage } = require('../controllers/Packagecontroller');
const { createCity, updateCity, deleteCity, getAllCities } = require('../controllers/Citycontroller');
const { createCategory, updateCategory, getAllCategories, deleteCategory, getAllCategoryAdmin } = require('../controllers/CategoriesController');
const { CreateBanner, GetAllBanner, UpdateBanner, DeleteBanner, GetAllBannerActive, MakeSetting, GetSetting, UpdateSetting, createMarquee, updateMarquee, deleteMarquee, getAllMarquee, createBanner, getAllBanner, deleteBanner, updateBanner, createOfferBanner, getOfferAllBanner, deleteOfferBanner, updateOfferBanner } = require('../controllers/Webpage.controller');
const { createFBanner, getFAllBanner, getBanneronWhicPage, deleteFBanner, updateFBanner } = require('../controllers/Festival_controller');
const { verifyOtpAndSubmitForm, getAllFormData, deleteFormData, sendOtpForm } = require('../controllers/FormData.controller');
const { createCoupon, getAllCoupons, updateCoupon, deleteCoupon, getCouponById, checkCouponIsAvailable } = require('../controllers/coupon.controller');
const { getPaymentDetails } = require('../controllers/payment.controller');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/create-register', createPartner);
router.post('/verify-otp-register', verifyOtpAndEmail);
router.post('/resend-otp-register', resendAccountVerifyOtp);
router.post('/resend-forget-password-otp', resendForgetPasswordOtp);
router.post('/forget-password-Request', forgetPasswordRequest);
router.post('/verify-forget-otp', verifyForgetPasswordOtp);
router.post('/login', login);
router.post('/logout', logout);
router.post('/Create-Post', protect, upload.any(), CreatePost);
router.post('/paymentverification', paymentVerification)
router.get('/get-Listing-un', getUnApprovedPosts);
router.get('/get-listing', getAllPostApprovedPost);
router.get('/get-Listing-By-Address', getAllPostApprovedPostByAddress);
router.get('/get-listing/:id', getPostById);
router.delete('/delete-listing/:id', deletePostById);
router.delete('/delete-all-listings', deleteAllPost);
router.post('/register-list-user', ListUser);
router.get('/all-shops', getAllShops);
router.delete('/delete-shop/:id', DeleteListUser);
router.post('/login-shop-user', LoginListUser);
router.get('/list-of-shop-user', protect, GetAllShopListByPartner);
router.get('/My-Shop-Details', protect, MyShopDetails);
router.get('/My-Shop-Post', protect, getMyPostOnly);
router.get('/Post-by-categories/:Name', getPostByCategory);
router.post('/Create-Forget-Password', CreateForgetPasswordRequest)
router.post('/verify-Otp-For-ForgetPassword', verifyOtp)
router.post('/Upload-Profile-Image', protect, upload.single('image'), UploadProfileImage)
router.post('/Upload-Profile-Details', protect, UpdateProfileDetails)
router.put('/update-Is-Show/:id',updateIsShow)
router.put('/update-Is-Block/:id',updateIsBlock)

router.post('/Create-Offer-Banner', upload.single('image'), createOfferBanner)
router.get('/get-offer-Banner', getOfferAllBanner)
router.delete('/delete-offer-Banner/:id', deleteOfferBanner)
router.put('/update-offer-Banner/:id', upload.single('image'), updateOfferBanner)

router.put('/get-single-user/:id', getSingleListingUser);
router.put('/update-shop-address/:userId', updateShopAddress);


router.post('/Create-festival-Banner', upload.single('image'), createFBanner)
router.get('/get-festival-Banner', getFAllBanner)
router.get('/get-festival-Banner-query', getBanneronWhicPage)

router.delete('/delete-festival-Banner/:id', deleteFBanner)
router.put('/update-festival-Banner/:id', upload.single('image'), updateFBanner)



router.post('/Search', SearchByPinCodeCityAndWhatYouWant);
router.put('/My-Shop-Edit-post/:id', protect, upload.array('dishImage'), UpdateListing)
router.put('/admin-Shop-Edit-post', upload.fields([
    { name: 'MainImage', maxCount: 1 },
    { name: 'dishImage', maxCount: 10 },
]), UpdateListingAdmin)
router.put('/admin-Shop-Edit-post-bolt', upload.any(), UpdateListingByBolt)


// admins
router.post('/admin-create-packages', createPackage)
router.get('/admin-packages', getAllPackages)
router.put('/admin-update-packages/:id', updatePackage)
router.delete('/admin-delete-packages/:id', deletePackage)
router.get('/admin-post-un-approved', getUnApprovedPosts)
router.put('/admin-approve-post/:id', MakeAPostApproved)
router.put('/admin-update-shop/:id', updateDetailsOfListUser)
router.get('/admin-all-partner', getAllPartner)
router.delete('/delete-partner/:id', deletePartnerAccount);
router.get('/admin-by-partner-user/:id', GetAllShopListByPartnerAdmin);
router.get('/admin-payments/:id', showPaymentDetails);
router.get('/admin-all-payments', allPayments);
router.get('/admin-Statistics', getDashboardData);
router.post('/admin-create-city', upload.single('image'), createCity);
router.post('/admin-update-city/:id', upload.single('image'), updateCity);
router.delete('/admin-delete-city/:id', deleteCity);
router.get('/admin-get-all-cities', getAllCities);
router.post('/admin-create-categories', upload.array('image'), createCategory);
router.post('/admin-update-categories/:id', upload.array('image'), updateCategory);
router.get('/admin-get-categories', getAllCategories);
router.get('/get-all-categories', getAllCategoryAdmin);
router.delete('/admin-delete-categories/:id', deleteCategory);

router.post('/admin-create-city', createCity);
router.post('/admin-update-city/:id', updateCity);
router.get('/admin-get-city', getAllCities);
router.delete('/admin-delete-city/:id', deleteCity);
router.get('/admin-get-post', getMyAllPost);



// Banners
router.post('/create-banner', upload.single('image'), CreateBanner)
router.get('/get-banner', GetAllBanner)
router.get('/get-banner-active', GetAllBannerActive)

//setting
router.post('/setting', MakeSetting)
router.get('/get-setting', GetSetting)
router.post('/UpdateSetting', UpdateSetting)



router.delete('/delete-banner/:id', DeleteBanner)
router.post('/update-banner/:id', upload.single('image'), UpdateBanner)




// Route for creating a marquee
router.post('/create-marquee', createMarquee);

// Route for updating a marquee
router.patch('/update-marquee/:id', updateMarquee);

// Route for deleting a marquee
router.delete('/delete-marquee/:id', deleteMarquee);

// Route for getting all marquees
router.get('/get-all-marquees', getAllMarquee);



// form detail enquiry form routes here 
router.post('/send_otp_form', sendOtpForm);
router.post('/verify_otp_and_send_enquiry_form', verifyOtpAndSubmitForm);
router.get('/get_enquiry_form', getAllFormData);
router.delete('/delete_enquiry_form/:id', deleteFormData);

// coupon code routes here 

router.post('/create-coupon-code', createCoupon);
router.get('/get-all-coupon-code', getAllCoupons);
router.get('/get-single-coupon-code/:id', getCouponById);
router.put('/update-coupon-code/:id', updateCoupon);
router.delete('/delete-coupon-code/:id', deleteCoupon);
router.post('/verify-coupon-code', checkCouponIsAvailable);

router.put('/admin-update-package/:id',updatePackageInUser);
router.put('/update_show_detail/:id',updateStatusOfShowingNumber)
router.put('/update_show_Email/:id',updateStatusOfShowingEmail)

router.get('/get_user_by_username/:username', getListingByUserName);


router.get('/get-payment-detail',getPaymentDetails)


module.exports = router;
