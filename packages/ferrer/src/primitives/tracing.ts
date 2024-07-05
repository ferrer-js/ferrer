import type { Name } from "./name.js"

export type TraceVector = TraceEvent[]

export enum TraceEventType {
  INGRESS_CALL = 1,
  DOMAIN_CALL = 2,
  INGRESS_RETURN = 3,
  EGRESS_CALL = 4,
  EGRESS_RETURN = 5
}

export type TraceEvent =
  | [eventType: TraceEventType.INGRESS_CALL]
  | [eventType: TraceEventType.DOMAIN_CALL, resolvedName: Readonly<Name>]
  | [eventType: TraceEventType.INGRESS_RETURN]
  | [eventType: TraceEventType.EGRESS_CALL]
  | [eventType: TraceEventType.EGRESS_RETURN]
