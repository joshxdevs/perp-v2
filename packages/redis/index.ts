import { Redis } from "@upstash/redis"

export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_URL as string,
    token: process.env.UPSTASH_REDIS_TOKEN as string
})

export const STREAMS = {
    INPUT: "orders:input",
    OUTPUT: "orders:output"
} as const

export * from "@upstash/redis"
export * from "./types";
