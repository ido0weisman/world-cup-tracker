const { Router } = require('express');
const groupsController = require('./groups.controller');

const router = Router();

router.get('/',      groupsController.getAllGroups);
router.get('/:name', groupsController.getGroupByName);

module.exports = router;
