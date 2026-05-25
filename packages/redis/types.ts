export type CreateOrderMessage = {
    type: "CREATE_ORDER";
    payload: {
        orderId: number;
        userId: number;
        marketId: string;
        side: "LONG" | "SHORT";
        qty: number;
        margin: number;
        orderType: "limit" | "market";
        price?: number;

    }
}

export type CancelOrderMessage = {
    type: "CANCEL_ORDER";
    payload: {
        orderId: number;
        userId: number;
        marketId: string;
    }
}

export type InputStreamMessage = CreateOrderMessage | CancelOrderMessage;

export type OrderFilledMessage = {
    type: "ORDER_FILLED";
    payload: {
        orderId: number;
        fillId: number;
        makerId: number;
        takerId: number;
        marketId: string;
        price: number;
        qty: number;
        longId: number;
        shortId: number;
    }
}

export type OrderCancelledMessage = {
    type: "ORDER_CANCELLED";
    payload: {
        orderId: number;
        userId: number;
        refundmargin: number;
    }
}

export type OutputStreamMessage = OrderFilledMessage | OrderCancelledMessage;