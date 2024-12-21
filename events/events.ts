import { Event } from "../types/index";
import { ReadyEventSignal } from "./ready";


interface Events {
    [Event.Ready]: ReadyEventSignal;
}

export { Events };