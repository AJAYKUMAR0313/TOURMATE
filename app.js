/* eslint-disable import/no-extraneous-dependencies */
const path = require('path');
const express = require('express');
const morgan = require('morgan');
// eslint-disable-next-line import/no-extraneous-dependencies
const rateLimit = require('express-rate-limit');
// eslint-disable-next-line import/no-extraneous-dependencies

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
// eslint-disable-next-line import/no-extraneous-dependencies
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// // Further HELMET configuration for Security Policy (CSP)
// const scriptSrcUrls = ['https://unpkg.com/', 'https://tile.openstreetmap.org'];
// const styleSrcUrls = [
//   'https://unpkg.com/',
//   'https://tile.openstreetmap.org',
//   'https://fonts.googleapis.com/',
// ];
// const connectSrcUrls = ['https://unpkg.com', 'https://tile.openstreetmap.org'];
// const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: [],
//       connectSrc: ["'self'", ...connectSrcUrls],
//       scriptSrc: ["'self'", ...scriptSrcUrls],
//       styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
//       workerSrc: ["'self'", 'blob:'],
//       objectSrc: [],
//       imgSrc: ["'self'", 'blob:', 'data:', 'https:'],
//       fontSrc: ["'self'", ...fontSrcUrls],
//     },
//   }),
// );

// app.use((req, res, next) => {   res.setHeader("Content-Security-Policy", "script-src 'self' https://unpkg.com/leaflet@1.9.4/dist/leaflet.css https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");   next(); })

// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         'script-src': [
//           "'self'",
//           'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
//         ],
//         'style-src': [
//           "'self'",
//           'https://*.googleapis.com',
//           'https://unpkg.com',
//         ],
//         'img-src': [
//           "'self'",
//           'data:',
//           'https://*.openstreetmap.org',
//           'https://unpkg.com',
//         ],
//       },
//     },
//   }),
// );
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com',
      ],
      styleSrc: [
        "'self'",
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com',
        'https://fonts.googleapis.com',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https://cdnjs.cloudflare.com',
        'https://unpkg.com',
        'https://tile.openstreetmap.org',
      ],
      connectSrc: [
        "'self'",
        'ws://127.0.0.1:*', // Allow WebSocket connections on localhost
      ],
      fontSrc: [
        "'self'",
        'https://cdnjs.cloudflare.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com',
      ],
    },
  }),
);

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
//modifies incoming request (middleware because it stands between request and response )
app.use(express.json());
//1) Global middle wares
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));
// set decurity HTTP headers
app.use(helmet());
// first midddle wares
// console.log('process');
// console.log(process.env.NODE_ENV);

//development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Limit requests from same api
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP,please try again in an hour',
});

app.use('/api', limiter);

//Body parser ,reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

//Data Santization against NoSQL query injection helps in removing $ type signs in request object like {"$gt":""}
app.use(mongoSanitize());

//Data santization against xss
app.use(xss());

//prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// app.use((req, res, next) => {
//   console.log('hello from the middle ware');
//   next();
// });
//Test middle ware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  next();
});

//3)Routes

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `cant find ${req.originalUrl} on the server!`,
  // });
  // const err = new Error(`cant find ${req.originalUrl} on the server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`cant find ${req.originalUrl} on the server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
