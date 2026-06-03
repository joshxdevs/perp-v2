import { InputStreamMessage, OrderFilledMessage, redis, STREAMS } from "@repo/redis";
import { OrderBook } from "./Orderbook";


const GROUP_NAME = "engine-group";
const CONSUMER_NAME = "engine-1";

const orderbooks: Map<string, OrderBook> = new Map()

function getOrderbook(marketId: string): OrderBook {
    if (!orderbooks.has(marketId)) {
        orderbooks.set(marketId, new OrderBook(marketId))
    }
    return orderbooks.get(marketId)!
}

async function initializedRedisGroup() {
    try {
        await redis.xgroup(STREAMS.INPUT, {
            type: "CREATE",
            group: GROUP_NAME,
            id: "0",
            options: { MKSTREAM: true }
        })
        console.log(`Consumer group ${GROUP_NAME} initialized`)
    } catch (e: any) {
        if (e.message.includes("BUSYGROUP")) {
            console.log(`Consumer group ${GROUP_NAME} already exists`)
        } else {
            throw e
        }

    }
}

async function processMessage(messageId: string, data: any) {
    try {
        const parsed: InputStreamMessage = typeof data === "string" ? JSON.parse(data) : data

        if (parsed.type === "CREATE_ORDER") {
            console.log(`Processing CREATE_ORDER for ${parsed.payload.marketId}`)
            const ob = getOrderbook(parsed.payload.marketId)

            const fills = ob.addOrder(parsed.payload)

            for (const fill of fills) {
                const outMsg: OrderFilledMessage = {
                    type: "ORDER_FILLED",
                    payload: fill
                }
                await redis.xadd(STREAMS.OUTPUT, "*", { data: JSON.stringify(outMsg) })
                console.log(`Pushed ORDER_FILLED event for the fillId ${fill.fillId}`)
            }
        }
    } catch (e) {
        console.error("Failed to parse or process message, skipping.", e)
    } finally {
        await redis.xack(STREAMS.INPUT, GROUP_NAME, messageId)
    }
}


async function mainLoop() {
    console.log("Engine started, Listening for orders...")
    await initializedRedisGroup()
    while (true) {
        try {
            const response = await redis.xreadgroup(
                GROUP_NAME,
                CONSUMER_NAME,
                STREAMS.INPUT,
                ">",
                { count: 1, blockMS: 2000 }
            )
            if (!response || response.length === 0) continue

            const streamResult = response[0] as any
            const messages = streamResult[1]

            for (const msg of messages as any[]) {
                const messageId = msg[0]
                const kvPairs = msg[1]

                let dataPayload = ""
                for (let i = 0; i < kvPairs.length; i += 2) {
                    if (kvPairs[i] === "data") {
                        dataPayload = kvPairs[i + 1]
                    }
                }
                if (dataPayload) {
                    await processMessage(messageId, dataPayload)
                } else {
                    await redis.xack(STREAMS.INPUT, GROUP_NAME, messageId)
                }
            }
        } catch (e) {
            console.error("Error in engine loop", e)
            await new Promise(r => setTimeout(r, 1000))
        }
    }

}

mainLoop();