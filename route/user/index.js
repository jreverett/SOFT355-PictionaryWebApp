const express = require('express');
const router = express.Router();

// Import user schema
const User = require('../../model/user');

// User signup api
router.post('/signup', (req, res, next) => {
  let newUser = new User();

  newUser.name = req.body.name;
  newUser.email = req.body.email;
  newUser.accountType = req.body.accountType;
  newUser.points = 0;
  newUser.setPassword(req.body.password);

  newUser.save((err, User) => {
    if (err) {
      return res.status(500).send({
        message: 'Failed to add user: ' + err
      });
    } else {
      return res.status(201).send({
        message: 'User added successfully'
      });
    }
  });
});

// User login api
router.post('/login', (req, res) => {
  User.findOne({ email: req.body.email }, function(err, user) {
    if (user === null) {
      return res.status(400).send({
        message: 'User not found'
      });
    } else {
      if (user.passwordIsValid(req.body.password)) {
        return res.status(200).send({
          message: 'User logged in'
        });
      } else {
        return res.status(400).send({
          message: 'Wrong password'
        });
      }
    }
  });
});

// User deletion api
router.post('/delete', (req, res, next) => {
  var user = { email: 'testemail@email.com' };

  User.collection.deleteOne(user, function(err, obj) {
    if (err) {
      return res.status(500).send({
        message: 'Failed to delete user: ' + err
      });
    } else {
      return res.status(204).send({
        message: 'User deleted successfully'
      });
    }
  });
});

module.exports = router;
