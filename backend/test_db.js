const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sajilo')
  .then(async () => {
    const Report = mongoose.model('Report', new mongoose.Schema({}, { strict: false }));
    const reports = await Report.find().sort({ createdAt: -1 }).limit(3);
    console.log(JSON.stringify(reports, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
