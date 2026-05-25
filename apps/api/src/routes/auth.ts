import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "@repo/db";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const router = Router();

const SignupSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters").max(50),
    password: z.string().min(6, "Password must be at least 6 characters ")
})

const SigninSchema = z.object({
    username: z.string(),
    password: z.string()
})

router.post("/signup", async (req: Request, res: Response) => {
    const result = SignupSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({
            message: result.error.issues[0]?.message
        })
    }
    const { username, password } = result.data

    try {
        const existingUser = await prisma.user.findUnique({
            where: { username }
        })
        if (existingUser) {
            return res.status(409).json({
                message: "Username already taken"
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const newUser = await prisma.user.create({
            data: { username, password: hashedPassword },
            select: { id: true, username: true }
        })

        const token = jwt.sign({ userId: (newUser).id }, process.env.JWT_SECRET as string, { expiresIn: "7d" })
        return res.status(201).json({
            token,
            userId: newUser.id,
            username: newUser.username
        })

    } catch (e) {
        console.error(e)
        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
})

router.post("/signin", async (req: Request, res: Response) => {
    const result = SigninSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({
            message: "Invalid input"
        })
    }

    const { username, password } = result.data

    try {
        const user = await prisma.user.findUnique({
            where: { username }
        })
        const passwordMatch = user ? await bcrypt.compare(password, user.password) : false;
        if (!user || !passwordMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            })
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: "7d" })
        return res.json({
            token, userId: user.id, username: user.username
        })


    } catch (e) {
        console.error(e)
        return res.status(500).json({
            message: "Internal server error"
        })
    }
})

export default router;