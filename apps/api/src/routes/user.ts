import { Router, Response } from "express";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod"
import { AuthRequest } from "../types";
import { prisma } from "@repo/db";

const router = Router()

router.use(authMiddleware)

const OnrampSchema = z.object({
    amount: z.number().positive("Amount must be positive")
})

router.post("/onramp", async (req: AuthRequest, res: Response) => {
    const result = OnrampSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({
            message: result.error.issues[0]?.message
        })
    }
    const { amount } = result.data

    try {
        const user = await prisma.user.update({
            where: { id: req.userId },
            data: { available: { increment: amount } },
            select: { id: true, available: true, locked: true }
        })
        return res.json({
            message: "Funds added",
            balance: user
        })

    } catch (e) {
        console.error(e)
        return res.status(500).json({
            message: "Internal server error"
        })
    }
})

router.get("/equity", async (req: AuthRequest, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { id: true, username: true, available: true, locked: true }
        })
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }
        return res.json(user)
    } catch (e) {
        console.error(e)
        return res.status(500).json({
            message: "Internal server error"
        })
    }
})

router.get("/positions", async (req: AuthRequest, res: Response) => {
    try {
        const positions = await prisma.position.findMany({
            where: { userId: req.userId! }
        });
        return res.json(positions);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
})

router.get("/orders", async (req: AuthRequest, res: Response) => {
    const { status, marketId } = req.query;
    try {
        const orders = await prisma.order.findMany({
            where: {
                userId: req.userId!,
                ...(status && { status: status as string }),
                ...(marketId && { marketId: marketId as string }),
            },
            orderBy: { id: "desc" }
        });
        return res.json(orders);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal Server Error" });
    }
})

router.get("/fills", async (req: AuthRequest, res: Response) => {
    try {
        const fills = await prisma.fill.findMany({
            where: {
                OR: [
                    { makerId: req.userId! },
                    { takerId: req.userId! }
                ]
            },
            orderBy: { id: "desc" }
        })
        return res.json(fills)
    } catch (e) {
        console.error(e)
        return res.status(500).json({
            message: "Internal server error"
        })
    }
})

export default router