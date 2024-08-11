const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  const token = signToken(newUser._id);
  // const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
  //   expiresIn: process.env.JWT_EXPIRES_IN,
  // });

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) Chechk if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  //2)Check if users existes && password is correxct
  const user = await User.findOne({ email }).select('+password');

  // console.log(user);
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  //3)if everything is ok send token to the client
  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  //1} getting token and check if its exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // console.log(token);
  if (!token) {
    return next(
      new AppError('You are not logged in please login to get access', 401),
    );
  }
  //2) verification token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  //3)Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist',
        401,
      ),
    );
  }
  //4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError('User recently changed password!Please log in again', 401),
    );

  //grant access to the protected route
  req.user = currentUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    //roles ['admin','lead-guide'].role='user'
    // console.log('Roles allowed:', roles);
    // console.log('User role:', req.user.role);
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };

// Here's a simplified summary of what's going on in this lecture:

// 1. User forgot / wants to change his password

// 2. We create a new, temporary password for the user using node's crypto module:

// const resetToken = crypto.randomBytes(36).toString('hex');
// 3. This creates a 72 characters long, cryptographically strong (very random) password using hexadecimal encoding (numbers 0-9, letters A-F). Try running this in the terminal to understand the returned value:

// node -e "console.log(require('crypto').randomBytes(4).toString('hex'));"

// 4. We create hashed version of this password using crypto module's createHash function, since we never want to store plain text passwords in the database.

// 5. We've chosen "sha256" hashing function, which is a very fast operation (as opposed to bcrypt's slow hashing function), which is why we don't have to do this operation asynchronously, as it takes less than a millisecond to complete. The downside to this is that possible attackers can compare our hash to a list of commonly used passwords a lot more times in a given time frame then if using bcrypt, which is a slow operation. So you can do millions of password checks in the same amount of time that it takes to make 1 check using bcrypt. However, this is not a problem here as: a) we used a very long and very random password (as opposed to user generated passwords, which usually have meaning and are far from random) and b) our password is only valid for 10 minutes, so there is literally zero chance for the attacker to guess the password in that short amount of time.

// 6. We send a plain-text version of our password back to the user so he/she can use it to log-in for the next 10 minutes.

// And that's it for this lesson..
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)get user based on POSTED mail
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address', 404));
  }
  //2)Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  //3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forget your password ? Submit a patch request with your new password and password confirm to :${resetURL}.\n If you did not forget your password, please ignore this email`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message: message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500,
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2) set new password if token has not expired and there is a user
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  //3) update changePasswordAt property for the user

  //4) log in the user and send JWT
  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    token,
  });
});
