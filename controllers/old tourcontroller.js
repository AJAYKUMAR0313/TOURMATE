// const fs = require('fs');

// const mongoose = require('mongoose');
const Tour = require('../models/tourmodel');

exports.aliasTopTours = (req, res, next) => {
  // console.log(req.query);
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingAverage,summary,difficulty';
  next();
};

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
// );
// exports.checkID = (req, res, next, val) => {
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'invalid ID',
//     });
//   }
//   next();
// };

// exports.checkBody = (req, res, next) => {
//   // console.log(`helloo ${req.body.name}`);
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'fail',
//       message: 'bad Request',
//     });
//   }
//   next();
// };
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    console.log(queryString);
    // console.log(req.query);
  }

  filter() {
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    const queryObj = { ...this.queryString };
    // console.log(queryObj);
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    // 2) ADVANCED FILTERING
    let queryStr = JSON.stringify(queryObj);
    // console.log(queryStr);
    queryStr = queryStr.replace(/(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // let query = Tour.find(JSON.parse(queryStr));
    this.query = this.query.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.queryString) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
      //- indicates excluding
    }
    return this;
  }

  pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    console.log(page, limit, skip);
    // http://127.0.0.1:3000/api/v1/tours?page=2&limit=10 1-10,page 1,11-20,page 2,21-30 page 3
    this.query = this.query.skip(skip).limit(limit);
    // console.log(this.query);
    return this;
  }
}

exports.getAllTours = async (req, res) => {
  // console.log(req.requestTime);
  try {
    // console.log(req.query);
    // eslint-disable-next-line node/no-unsupported-features/es-syntax

    //BUILD QUERY

    //1.FILTERING
    // eslint-disable-next-line node/no-unsupported-features/es-syntax
    // const queryObj = { ...req.query };
    // const excludedFields = ['page', 'sort', 'limit', 'fields'];
    // excludedFields.forEach((el) => delete queryObj[el]);
    // // const tours = await Tour.find({
    // //   duration: req.query.duration,
    // //   difficulty: req.query.difficulty,
    // // });

    // // 2) ADVANCED FILTERING
    // let queryStr = JSON.stringify(queryObj);
    // queryStr = queryStr.replace(/(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    // // console.log(JSON.parse(queryStr));
    // //without g only replaces fist occurance
    // // with g replaces all the occurances
    // // {diffculty:'easy',duration:{$gte:5}}
    // // {diffculty:'easy',duration:{gte:'5'}}
    // //gte,gt,lte,lt
    // let query = Tour.find(JSON.parse(queryStr));

    //1B Sorting
    // if (req.query.sort) {
    //   const sortBy = req.query.sort.split(',').join(' ');
    //   query = query.sort(sortBy);
    // } else {
    //   query = query.sort('-createdAt');
    // }
    // console.log(query);

    // 3)Field limiting
    // if (req.query.fields) {
    //   const fields = req.query.fields.split(',').join(' ');
    //   query = query.select(fields);
    // } else {
    //   query = query.select('-__v');
    //   //- indicates excluding
    // }

    //4)PAGINATION
    // const page = req.query.page * 1 || 1;
    // const limit = req.query.limit * 1 || 100;
    // const skip = (page - 1) * limit;
    // // http://127.0.0.1:3000/api/v1/tours?page=2&limit=10 1-10,page 1,11-20,page 2,21-30 page 3
    // query = query.skip(skip).limit(limit);

    // if (req.query.page) {
    //   const numTours = await Tour.countDocuments();
    //   if (skip >= numTours) throw new Error('This page does not exist');
    // }

    // EXECUTE QUERY
    // console.log('hello from execution');
    // console.log(req.query);
    const features = new APIFeatures(Tour.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .pagination();
    console.log('Final Query:', features.query);
    const tours = await features.query;

    // const tours = await Tour.find();
    // console.log('tours');
    // console.log(typeof tours);
    // const tours = await query;
    // const tours = await Tour.find()
    //   .where('duration')
    //   .equals(5)
    //   .where('difficulty')
    //   .equals('easy');
    // const query = await Tour.find()
    //   .where('duration')
    //   .equals(5)
    //   .where('difficulty')
    //   .equals('easy');
    // console.log(tours.length);

    //SEND RESPONSE
    res.status(200).json({
      status: 'success',
      // requestedAt: req.requestTime,
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (err) {
    // console.log(req.query);
    res.status(404).json({
      status: 'fail',
      message: err.message,
    });
  }
};
exports.getTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    //Tour.findOne({_id:req.params.id})
    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      messgae: err,
    });
  }
  // console.log(req.params);
  // const id = req.params.id * 1;

  // if (id>tours.length){
  //         return res.status(404).json(
  //             {
  //                 status:'fail',
  //                 message:"invalid id"
  //             }
  //         )

  //     }
  // const tour = tours.find((el) => el.id === id);
  // if (tour) {
  //   res.status(200).json({
  //     status: 'success',
  //     data: {
  //       tour,
  //     },
  //   });
  // }
};
exports.createTour = async (req, res) => {
  try {
    // const newTour =new Tour({})
    // newTour.save()
    const newTour = await Tour.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        tour: newTour,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'fail',
      message: err,
    });
  }
  // const newid = tours[tours.length - 1].id + 1;
  // const newTour = Object.assign({ id: newid }, req.body);
  // tours.push(newTour);
  // // res.json(tours)
  // fs.writeFile(
  //   `${__dirname}/../dev-data/data/tours-simple.json`,
  //   JSON.stringify(tours),
  //   () => {
  //     res.status(201).json({
  //       status: 'success',
  //       data: {
  //         tour: newTour,
  //       },
  //     });
  //   },
  // );
};
exports.updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      status: 'success',
      data: {
        tour,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};
exports.deleteTour = async (req, res) => {
  try {
    await Tour.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err,
    });
  }
};

exports.getTourStats = async (req, res) => {
  try {
    // Define the aggregation pipeline where the collection goes through these stages
    const stats = await Tour.aggregate([
      {
        // Stage 1: Match tours with an average rating greater than or equal to 4.5
        $match: {
          ratingsAverage: { $gte: 4.5 },
        },
      },
      {
        // Stage 2: Group the results and calculate average rating, average price, minimum price, and maximum price
        $group: {
          _id: { $toUpper: '$difficulty' }, // Group by null to get overall statistics
          numTours: { $sum: 1 },
          numsRatings: { $sum: '$ratingsQuantity' },
          avgRating: { $avg: '$ratingsAverage' }, // Calculate the average rating
          avgPrice: { $avg: '$price' }, // Calculate the average price
          minPrice: { $min: '$price' }, // Calculate the minimum price
          maxPrice: { $max: '$price' }, // Calculate the maximum price (added to make stats more comprehensive)
        },
      },
      {
        //1 for ascending
        $sort: { avgPrice: 1 },
      },
      {
        $match: {
          _id: { $ne: 'EASY' },
        },
      },
    ]);

    // Send a successful response with the calculated statistics
    res.status(200).json({
      status: 'success',
      data: {
        stats,
      },
    });
  } catch (err) {
    // Handle any errors that occur during the aggregation
    res.status(404).json({
      status: 'fail',
      message: err.message, // Use err.message to provide a more specific error message
    });
  }
};
exports.getMonthlyPlan = async (req, res) => {
  try {
    const year = req.params.year * 1;
    const plan = await Tour.aggregate([]);
    res.status(200).json({
      status: 'success',
      data: {
        plan,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: 'fail',
      message: err.message, // Use err.message to provide a more specific error message
    });
  }
};
