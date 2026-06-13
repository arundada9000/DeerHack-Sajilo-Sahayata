import { config } from 'dotenv';
config();
import { analyzeDisasterImage } from './src/services/aiService';

const run = async () => {
    console.log("Analyzing image...");
    // A random image url to test
    const url = "https://res.cloudinary.com/dcf7vh0fr/image/upload/v1779355953/reports/ygv8ry5dhj1yribwodft.jpg"; 
    const res = await analyzeDisasterImage(url, "flood");
    console.log("Result:");
    console.log(JSON.stringify(res, null, 2));
};

run().catch(console.error);
