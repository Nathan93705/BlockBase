import { RealTimeDB } from "../Firebase";
import { Event } from "../types/index";
import { EventSignal } from "./event";

class ReadyEventSignal extends EventSignal {
    public readonly id = Event.Ready;

    public readonly rtdb: RealTimeDB

    public constructor(rtdb: RealTimeDB) {
        super();
        this.rtdb = rtdb
    }

}

export { ReadyEventSignal };