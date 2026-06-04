// Simple in-memory rate limiter — no extra packages needed
// For production at scale, swap this out for express-rate-limit + Redis

const requests = new Map();

const rateLimiter = (maxRequests, windowMs) => {
	return (req, res, next) => {
		const key = req.ip;
		const now = Date.now();

		if (!requests.has(key)) {
			requests.set(key, []);
		}

		// Remove timestamps outside the window
		const timestamps = requests.get(key).filter((t) => now - t < windowMs);
		timestamps.push(now);
		requests.set(key, timestamps);

		if (timestamps.length > maxRequests) {
			return res.status(429).json({ error: "Too many requests, please try again later." });
		}

		next();
	};
};

// Clean up old entries every 5 minutes to avoid memory leaks
setInterval(() => {
	const now = Date.now();
	for (const [key, timestamps] of requests.entries()) {
		const recent = timestamps.filter((t) => now - t < 15 * 60 * 1000);
		if (recent.length === 0) {
			requests.delete(key);
		} else {
			requests.set(key, recent);
		}
	}
}, 5 * 60 * 1000);

export default rateLimiter;
