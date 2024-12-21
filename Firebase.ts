import {
    http,
    HttpHeader,
    HttpRequest,
    HttpRequestMethod,
} from "@minecraft/server-net";
import { QueryOptions, JSONValue } from "./types/index";
import { Event } from "./types/index";
import { EventEmitter } from "./classes/emmiter";
import { Events, ReadyEventSignal } from "./events/index";

class RealTimeDB extends EventEmitter<keyof Events, Events[Event]> {
    /**
     * @param name The Database Name - Something like `[PROJECT_ID]-default-rtdb`
     * @param secret The Database Serect
     *
     * Both Can Be Found Here
     * `https://console.firebase.google.com/u/0/project/[PROJECT_ID]/settings/serviceaccounts/databasesecrets`
     */
    constructor(name: string, secret: string) {
        super();
        this.databaseSecret = secret.trim();
        this.databaseName = name.trim();

        this.validate();
    }

    public databaseSecret: string;
    public databaseName: string;

    private _ready = false;
    public get ready() {
        return this._ready;
    }

    private async validate() {
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

        this._ready = true;

        this.emit(new ReadyEventSignal(this));
    }

    /**
     *
     * @param path The Path Where You Want To Get The Data
     * @param options QueryOptions
     * @returns The Data At The Path
     * @example
     *
     * ```ts
     *  const rtdb = new RealTimeDB("database-name", "database-secret")
     *  rtdb.once(Event.Ready, async () => {
     *     const users = Object.keys(rtdb.get("users", {shallow: true}))
     *      console.log(`Users: ${users.join()}`)
     *  })
     * ```
     *
     */
    public async get(
        path: string,
        options?: QueryOptions
    ): Promise<JSONValue | undefined> {
        if (!this.ready) throw Error(`[RealTimeDB] Database isnt Ready`);

        const response = await this.sendRequest(path, "Get", options ?? {});
        if (response.status !== 200) return;
        console.log(response.body);
        const body = JSON.parse(response.body);
        return body;
    }

    /**
     *
     * @param path The Path Where You Want To Set The Data
     * @param options The Data
     * @param options QueryOptions
     * @returns A Boolean Wether The Data Was Set
     * @example
     *
     * ```ts
     *  const rtdb = new RealTimeDB("database-name", "database-secret")
     *  rtdb.once(Event.Ready, async () => {
     *     rtdb.set("users/steve", {name: "Minecraft Steve"})
     *  })
     * ```
     *
     */
    public async set(
        path: string,
        data: JSONValue,
        options?: QueryOptions
    ): Promise<boolean> {
        if (!this.ready) throw Error(`[RealTimeDB] Database isnt Ready`);

        let dataString = "";
        if (typeof data === "string") dataString = data;
        else if (typeof data === "number" || typeof data === "boolean")
            dataString = `${data}`;
        else dataString = JSON.stringify(data);

        const response = await this.sendRequest(
            path,
            "Put",
            options ?? {},
            dataString
        );
        if (response.status !== 200) return false;
        return true;
    }

    public async sendRequest(
        path: string,
        method: string,
        options: QueryOptions,
        body?: string
    ) {
        const optionsString = Object.entries(options)
            .map(([key, value]) => `${key}=${value}`)
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

export { RealTimeDB };
