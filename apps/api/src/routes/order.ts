import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "@repo/db";
import { redis, STREAMS } from "@repo/redis";
import { CancelOrderMessage, CreateOrderMessage } from "@repo/redis";
import { authMiddleware } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router()

router.use(authMiddleware)

const CreateOrderSchema = z.object({
    marketId: z.string().min(1),
    side: z.enum(["LONG", "SHORT"]),
    qty: z.number().positive(),
    margin: z.number().positive(),
    orderType: z.enum(["limit", "market"]),
    price: z.number().positive().optional()
}).refine(
    (data) => data.orderType === "market" || data.price !== undefined,
    { message: "Price is required for limit orders", path: ["price"] }
)

const CancelOrderSchema = z.object({
    orderId: z.number().int().positive()
})

router.post("/", async (req: AuthRequest, res: Response) => {
    const result = CreateOrderSchema.safeParse(req.body)
    if (!result.success) {
        return res.status(400).json({
            message: result.error.issues[0].message
        })
    }
    const { marketId, side, qty, margin, orderType, price } = result.data
    const userId = req.userId!

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { available: true }
        })

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            })
        }
        if (user.available < margin) {
            return res.status(400).json({
                message: `Insufficient collateral. Required ${margin}, available ${user.available}`
            })
        }
        const [order] = await prisma.$transaction([
            prisma.order.create({
                data: {
                    userId,
                    marketId,
                    type: side,
                    qty,
                    margin,
                    orderType,
                    price: price ?? null,
                    status: "pending",
                }
            }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    available: { decrement: margin },
                    locked: { increment: margin }
                }
            })
        ])

        const message: CreateOrderMessage = {
            type: "CREATE_ORDER",
            payload: {
                orderId: order.id,
                userId,
                marketId,
                side,
                qty,
                margin,
                orderType,
                price,
            }
        }
        await redis.xadd(STREAMS.INPUT, "*", { data: JSON.stringify(message) })
        return res.status(202).json({
            message: "order accepted and queued for processing",
            orderId: order.id,
            status: "pending"
        })

    } catch (e) {
        console.error(e)
        return res.status(500).json({
            message: "Internal server error"
        })
    }


})

router.delete("/:orderId", async (req: AuthRequest, res: Response) => {
    const result = CancelOrderSchema.safeParse({ orderId: Number(req.params.orderId) })
    if (!result.success) {
        return res.status(400).json({
            message: "Invalid Order ID"
        })
    }
    const { orderId } = result.data
    const userId = req.userId!

    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { userId: true, marketId: true, status: true }
        })
        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            })
        }
        if (order.userId !== userId) {
            return res.status(403).json({
                message: "Forbidden: This is not your order"
            })
        }
        if (!["pending", "open"].includes(order.status)) {
            return res.status(400).json({
                message: `Cannot cancel an order with status ${order.status}`
            })
        }

        const message: CancelOrderMessage = {
            type: "CANCEL_ORDER",
            payload: {
                orderId,
                userId,
                marketId: order.marketId
            }
        }

        await redis.xadd(STREAMS.INPUT, "*", { data: JSON.stringify(message) })
        return res.status(202).json({
            message: "Cancel request accepted and queued",
            orderId,
        });

    } catch (e) {
        console.error(e)
        return res.status(500).json({
            message: 'Internal server error'
        })
    }
})

export default router;