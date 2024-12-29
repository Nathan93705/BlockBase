import { http, HttpHeader, HttpRequest, HttpRequestMethod } from "@minecraft/server-net";
import { QueryOptions } from "./types/options";

type CacheData = string | number | boolean | null | CollectionMap;

type CollectionMap = Map<string, Collection>;

class Collection {
    private cache: CacheData;
    private path: string;
    private db: RealTimeDB;
    private expiresAt: number;
    private ready: Promise<void>;

    constructor(path: string, db: RealTimeDB, cacheData?: CacheData) {
        this.path = path;
        this.db = db;
        if (cacheData) {
            this.cache = cacheData;
            this.expiresAt = Date.now() + db.ttl;
            this.ready = Promise.resolve();  // No need to update cache if we already have data
        } else {
            this.ready = this.updateCache();  // Wait for cache update
        }
    }

    // Asynchronously update the cache from the database
    async updateCache(): Promise<void> {
        const response = await this.db.sendRequest(this.path, "Get", {});
        if (response.status !== 200) return;

        const body = JSON.parse(response.body);
        // Only update cache if body is a valid object
        if (typeof body === "object" && body !== null) {
            this.cache = body;
        } else {
            this.cache = body;  // Assign directly if not an object
        }
        this.expiresAt = Date.now() + this.db.ttl; // Set expiration after updating cache
    }

    // Asynchronously update the database with the current cache
    async updateDatabase(): Promise<void> {
        await this.db.sendRequest(this.path, "Put", {}, JSON.stringify(this.cache));
    }

    // Get the cache, and update it if expired or requested
    async get(updateCache: boolean = false): Promise<CacheData> {
        await this.ready;  // Ensure the cache is updated before accessing it
        if (Date.now() > this.expiresAt || updateCache) {
            await this.updateCache();
        }
        return this.cache;
    }

    // Set new data and update the database
    async set(data: CacheData): Promise<void> {
        await this.updateDatabase();
        this.cache = data;
    }
}

// Converts an object into a map of collections
function objectToCollections(object: Record<string, CacheData>, db: RealTimeDB): CollectionMap {
    const collectionsMap = new Map<string, Collection>();

    for (const key of Object.keys(object)) {
        const path = key;
        const cacheData = object[key];
        const collection = new Collection(path, db, cacheData);
        collectionsMap.set(path, collection);
    }

    return collectionsMap;
}

class RealTimeDB {
    public cache: Record<string, { data: any; expiresAt: number }>;
    public databaseSecret: string;
    public databaseName: string;
    public ttl: number;
    private readyPromise: Promise<void>;
    private readyResolver: () => void;
    private cachedCollections: CollectionMap;

    constructor(name: string, secret: string, ttl: number = 300000) {
        this.cache = {};
        this.cachedCollections = new Map();
        this.databaseSecret = secret.trim();
        this.databaseName = name.trim();
        this.ttl = ttl;
        this.readyPromise = new Promise((resolve) => this.readyResolver = resolve);
        this.initialize();
    }

    private async initialize() {
        const response = await this.sendRequest("", "Get", { shallow: true });
        const body = JSON.parse(response.body);
        if (response.status !== 200) {
            switch (response.status) {
                case 404:
                    throw Error(
                        `[RealTimeDB] Failed To Find Database: "${this.databaseName}"`
                    );

                case 401:
                    throw Error(
                        `[RealTimeDB] Permission Denied To The Database: "${this.databaseName}"`
                    );

                default:
                    throw Error(`[RealTimeDB] Error Validating Database Info: ${body}`);
            }
        }

        this.readyResolver();
    }

    // Wait until the database is ready
    public async onReady(callback?: () => void): Promise<void> {
        await this.readyPromise;
        if (callback) callback();
    }

    // Get a collection or data from the database
    public async get(
        path: string
    ): Promise<CacheData | Collection> {
        // Check if collection already exists in cache
        if (this.cachedCollections.has(path)) {
            return this.cachedCollections.get(path);
        }

        const response = await this.sendRequest(path, "Get", {});
        if (response.status !== 200) return;

        const body = JSON.parse(response.body);
        let collection;

        if (typeof body === "object" && body !== null) {
            collection = objectToCollections(body, this);
        } else {
            collection = body;
        }

        this.cachedCollections.set(path, collection);  // Cache the result
        return collection;
    }

    // Send a request to the Firebase database
    public async sendRequest(
        path: string,
        method: string,
        options: QueryOptions = {},
        body?: string
    ) {
        const optionsString = Object.entries(options)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join("&");

        const queryString = optionsString ? `&${optionsString}` : "";

        const uri = `https://${this.databaseName}.firebaseio.com/${path}.json?auth=${this.databaseSecret}${queryString}`;

        const request = new HttpRequest(uri);
        request.method = method as HttpRequestMethod;

        if (body) request.body = body;
        request.headers = [new HttpHeader("Content-Type", "application/json")];

        return http.request(request);
    }
}

const rtdb = new RealTimeDB("test-server-net-default-rtdb", "WO7Eq64BYRCSPBHSrQCt8QJkoxHVt5xXzjVCOqdh");

async function test() {
    const collections = await rtdb.get("users") as CollectionMap
    for (const [path, data] of collections.entries()) {
        console.log(`${path}: ${JSON.stringify(await data.get())}`)
    }
}

test();
