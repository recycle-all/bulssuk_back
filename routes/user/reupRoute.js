const router = require('express').Router();
const {
  getCompanies,
  getCompanyDetails,
} = require('../../controllers/user/reupController');

router.get('/company', getCompanies);
router.get('/company/:company_no', getCompanyDetails);

module.exports = router;
