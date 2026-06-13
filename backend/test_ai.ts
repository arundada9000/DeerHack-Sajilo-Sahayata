import { config } from 'dotenv';
config();
import { analyzeDisasterImage } from './src/services/aiService';

const run = async () => {
    console.log("Analyzing image...");
    const url = "https://res.cloudinary.com/dcf7vh0fr/image/upload/v1781356401/reports/msh35yazgkhmvrsc2sqi.jpg"; 
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type");
    
    console.log("Mime Type:", mime);
    
    // Pass buffer just like reportController does
    const analysis = await analyzeDisasterImage(url, "other", buf, mime);
    console.log("Result:");
    console.log(JSON.stringify(analysis, null, 2));
};

run().catch(console.error);
