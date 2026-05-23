import express from "express"
import helmet from "helmet"
import cors from "cors"
import rateLimit from "express-rate-limit"
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user"


const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json())

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again" }
})

app.use(limiter)

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Too many login attempts, please try again later" }
})

app.use("/auth", authLimiter, authRoutes)
app.use("/user", userRoutes)

app.get("/health", (_, res) => {
    res.json({
        status: "ok",
        timeStamp: new Date().toISOString(),
        localTimeStamp: new Date().toLocaleString("en-IN", {
            dateStyle: "full",
            timeStyle: "medium"
        })
    })
})

app.use((_, res) => {
    res.status(404).json({
        message: "Route not found"
    })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`API Server running on port ${PORT}`)
})