import { config } from 'dotenv';
config();
import { analyzeDisasterImage } from './src/services/aiService';

const run = async () => {
    console.log("Analyzing image...");
    const url = "https://res.cloudinary.com/dcf7vh0fr/image/upload/v1781355925/reports/zjxtl5f03acgzhydalmw.jpg"; 
    const res = await analyzeDisasterImage(url, "other");
    console.log("Result:");
    console.log(JSON.stringify(res, null, 2));
};

run().catch(console.error);
