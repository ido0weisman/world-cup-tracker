const groupsService = require('./groups.service');

function getAllGroups(req, res, next) {
  try {
    const groups = groupsService.getAllGroups();
    res.json({ groups });
  } catch (err) {
    next(err);
  }
}

function getGroupByName(req, res, next) {
  try {
    const group = groupsService.getGroupByName(req.params.name);
    res.json({ group });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllGroups, getGroupByName };
