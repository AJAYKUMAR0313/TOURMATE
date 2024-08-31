/* eslint-disable arrow-body-style */
const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

// eslint-disable-next-line arrow-body-style
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  console.log('Generated token:', token); // Log the token to the console
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    secure: true,
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  // console.log(token);
  // remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: token,
    data: {
      user,
    },
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });
  // const newUser = await User.create(req.body);
  createSendToken(newUser, 201, res);
  // const token = signToken(newUser._id);
  // const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
  //   expiresIn: process.env.JWT_EXPIRES_IN,
  // });

  // res.status(201).json({
  //   status: 'success',
  //   token,
  //   data: {
  //     user: newUser,
  //   },
  // });
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
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};
// DESCRIPTION FOR PROTECT:{
// This code is a middleware function in Node.js that is designed to protect certain routes by checking if the user is authenticated and authorized to access them. Let's break down the code step by step:

// Token Retrieval and Existence Check:

// The code first tries to extract the JWT token from the request headers.
// It checks if the token exists and starts with 'Bearer'.
// If the token doesn't exist, it returns an error using the AppError class with a message "You are not logged in please login to get access" and a status code of 401 (Unauthorized).
// Token Verification:

// Next, it verifies the token by using jwt.verify function, which decodes the JWT token by passing the token and a secret key stored in the environment variable (JWT_SECRET).
// The decoded token information is stored in the decoded variable.
// Existing User Check:

// It then tries to find the user associated with the decoded token's ID by using User.findById (assuming User is a model for users).
// If no user is found with the decoded ID, it returns an error with a message "The user belonging to this token does no longer exist" and a status code of 401.
// Password Change Check:

// It checks if the user changed their password after the token was issued. If the password was changed after the token's issue time (decoded.iat), it returns an error with the message "User recently changed password! Please log in again" and a status code of 401.
// Granting Access:

// If all the checks pass successfully, it assigns the currentUser to req.user to make the user available for further processing in subsequent middleware or route handlers.
// It then calls next() to pass control to the next middleware in the chain.
// In summary, this middleware function protects routes by ensuring that the user is authenticated with a valid JWT token, the user exists in the database, and the password has not been changed after issuing the token. If any of these conditions are not met, it returns an error response. If all checks are successful, it allows the user to access the protected route.
exports.protect = catchAsync(async (req, res, next) => {
  // 1} getting token and check if its exists
  // console.log('Request headers:', req.headers); // Add this line to log the request headers
  // console.log('hello');
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  console.log('token', token);
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
  // console.log(currentUser);
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
  res.locals.user = currentUser;
  next();
});
// /only for render pages
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    // 1 ) Verify token
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );
      //2)Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) return next();
      //grant access to the protected route
      //There is a login user
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']role='user'
    console.log(req.user.role);
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };
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
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get the user from collection
  const user = await User.findById(req.user.id).select('+password');
  //2) CHeck if posted current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your Current Password is Wrong.', 401));
  }
  //3) If so,update Password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  //4) Log user in ,send JWT
  // const token = signToken(user._id);
  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });
  createSendToken(user, 200, res);
});
