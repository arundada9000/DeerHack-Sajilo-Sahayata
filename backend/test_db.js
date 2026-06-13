require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));
    const reports = await Report.find().sort({ createdAt: -1 }).limit(2);
    console.log(JSON.stringify(reports, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
