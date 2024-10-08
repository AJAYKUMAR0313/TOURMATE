const AppError = require('../utils/appError');

/* eslint-disable node/no-unsupported-features/es-syntax */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}:${err.value}.`;
  // console.log(err);
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // Log the error message for debugging
  console.log(err);
  // Extract the duplicate field value using regex
  const value = err.errorResponse.errmsg.match(/(["'])(\\?.)*?\1/)[0];

  // Log the extracted value for debugging
  console.log(value);

  // Construct a meaningful error message
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data.${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token.Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired please login again', 401);

const sendErrorDev = (err, req, res) => {
  //API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  //RENDERED WEBSITE
  console.error('ERROR mandhe', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};
const sendErrorProd = (err, req, res) => {
  //Operational trusted error:Send message to the client
  //APIS
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
      // Programminf or other unknow error:dont leak error details
    }
    // 1)log the error
    console.error('ERROR mandhe', err);
    //2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'something went very wrong',
    });
  }
  //RENDERES WEBSITE
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // Programming or other unknow error:dont leak error details
  // 1)log the error
  console.error('ERROR mandhe', err);
  //2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please Try Again Later.',
  });
};

module.exports = (err, req, res, next) => {
  console.log(err.stack);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message=err.message;
    // console.log('production', error);
    if (err.kind === 'ObjectId' && err.path === '_id')
      error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error._message === 'Validation failed') {
      error = handleValidationErrorDB(error); // Handle validation errors
    }
    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError')
      error = handleJWTExpiredError(error);
    sendErrorProd(error, req, res);
  }
};
