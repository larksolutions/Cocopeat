import ratelimit from "../config/upstash.js";

const rateLimiter = async (req, res, next) => {

    try {
        console.log("🔍 Checking Upstash rate limit...");

        const {success, limit, remaining, reset} = await ratelimit.limit("my-rate-limit");

        console.log("✅ Upstash is working! Rate limit info:", {
            success,
            limit,
            remaining,
            reset: new Date(reset)
        });

        if(!success){
            console.log("⚠️ Rate limit exceeded - blocking request");
            return res.status(429).json({message: "Too many requests. Please try again later."});
        }

        console.log(`✓ Request allowed - ${remaining} requests remaining`);
        next();

    } catch (error) {
        console.log("❌ Upstash connection error:", error);
        next(error);
    }
}

export default rateLimiter;