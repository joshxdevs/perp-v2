import { CreateOrderMessage, OrderFilledMessage } from "@repo/redis"

export interface Order {
    orderId: number;
    userId: number;
    qty: number;
    filledQty: number;
    price: number;
    side: "LONG" | "SHORT";
}

export class OrderBook {
    marketId: string;

    bids: Map<number, Order[]> = new Map();
    asks: Map<number, Order[]> = new Map();

    bidPrices: number[] = [];
    askPrices: number[] = [];

    constructor(marketId: string) {
        this.marketId = marketId;
    }

    public addOrder(orderParams: CreateOrderMessage["payload"]): OrderFilledMessage["payload"][] {
        const order: Order = {
            orderId: orderParams.orderId,
            userId: orderParams.userId,
            qty: orderParams.qty,
            filledQty: 0,
            price: orderParams.price || 0,
            side: orderParams.side
        }
        const fills: OrderFilledMessage["payload"][] = []
        let remainingQty = order.qty

        if (order.side === "LONG") {
            remainingQty = this.matchAgainstAsks(order, fills)
            if (remainingQty > 0 && orderParams.orderType === "limit") {
                this.insertBid(order)
            }
        } else {
            remainingQty = this.matchAgainstBids(order, fills)
            if (remainingQty > 0 && orderParams.orderType === "limit") {
                this.insertAsk(order)
            }
        }
        return fills;
    }

    private matchAgainstAsks(order: Order, fills: OrderFilledMessage["payload"][]): number {
        while (order.filledQty < order.qty && this.askPrices.length > 0) {
            const bestAskPrice = this.askPrices[0];

            if (order.price > 0 && bestAskPrice > order.price) break;
            const askQueue = this.asks.get(bestAskPrice)!
            const matchOrder = askQueue[0];
            const fillQty = Math.min(order.qty - order.filledQty, matchOrder.qty - matchOrder.filledQty)
            order.filledQty += fillQty
            matchOrder.filledQty += fillQty

            fills.push({
                orderId: order.orderId,
                fillId: Math.floor(Math.random() * 1000000),
                makerId: matchOrder.userId,
                takerId: order.userId,
                marketId: this.marketId,
                price: bestAskPrice,
                qty: fillQty,
                longId: order.orderId,
                shortId: matchOrder.orderId
            })

            if (matchOrder.filledQty === matchOrder.qty) {
                askQueue.shift()
                if (askQueue.length === 0) {
                    this.asks.delete(bestAskPrice)
                    this.askPrices.shift()
                }
            }

        }
        return order.qty - order.filledQty
    }

    private matchAgainstBids(order: Order, fills: OrderFilledMessage["payload"][]): number {
        while (order.filledQty < order.qty && this.bidPrices.length > 0) {
            const bestBidPrice = this.bidPrices[0]

            if (order.price > 0 && bestBidPrice < order.price) break
            const bidQueue = this.bids.get(bestBidPrice)!
            const matchOrder = bidQueue[0]
            const fillQty = Math.min(order.qty - order.filledQty, matchOrder.qty - matchOrder.filledQty)
            order.filledQty += fillQty
            matchOrder.filledQty += fillQty

            fills.push({
                orderId: order.orderId,
                fillId: Math.floor(Math.random() * 1000000),
                makerId: matchOrder.userId,
                takerId: order.userId,
                marketId: this.marketId,
                price: bestBidPrice,
                qty: fillQty,
                longId: matchOrder.orderId,
                shortId: order.orderId
            })

            if (matchOrder.filledQty === matchOrder.qty) {
                bidQueue.shift()
                if (bidQueue.length === 0) {
                    this.bids.delete(bestBidPrice)
                    this.bidPrices.shift()
                }
            }
        }
        return order.qty - order.filledQty
    }

    private insertBid(order: Order) {
        if (!this.bids.has(order.price)) {
            this.bids.set(order.price, [])
            this.insertSorted(this.bidPrices, order.price, true)
        }
        this.bids.get(order.price)!.push(order)
    }

    private insertAsk(order: Order) {
        if (!this.asks.has(order.price)) {
            this.asks.set(order.price, [])
            this.insertSorted(this.askPrices, order.price, false)
        }
        this.asks.get(order.price)!.push(order)
    }

    private insertSorted(arr: number[], val: number, descending: boolean) {
        let l = 0, r = arr.length - 1;
        while (l <= r) {
            const mid = Math.floor((l + r) / 2)
            if (arr[mid] === val) return
            if (descending ? arr[mid] < val : arr[mid] > val) {
                r = mid - 1;
            } else {
                l = mid + 1
            }
        }
        arr.splice(l, 0, val)
    }
}