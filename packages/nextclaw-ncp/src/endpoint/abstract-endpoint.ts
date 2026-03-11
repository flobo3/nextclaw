import type {
  NcpEndpoint,
  NcpEndpointEvent,
  NcpEndpointSubscriber,
} from "../types/endpoint.js";
import type { NcpEndpointManifest } from "../types/manifest.js";

/**
 * Base class for NCP endpoint adapters.
 *
 * Lifecycle (start/stop) and subscribe/broadcast. Subclass must implement
 * onStart, onStop, emit(); call broadcast() when an event is received from
 * the transport. When the endpoint is ready to send/receive, call
 * broadcast({ type: "endpoint.ready" }) — base class does not emit it.
 */
export abstract class AbstractEndpoint implements NcpEndpoint {
  abstract readonly manifest: NcpEndpointManifest;

  private started = false;
  private readonly listeners = new Set<NcpEndpointSubscriber>();

  async start(): Promise<void> {
    if (this.started) return;
    await this.onStart();
    this.started = true;
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    await this.onStop();
    this.started = false;
  }

  /** Subclass must implement: send event to the other peer (wire, queue, or in-process broadcast). */
  abstract emit(event: NcpEndpointEvent): void | Promise<void>;

  subscribe(listener: NcpEndpointSubscriber): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Call when an event is received from the transport; delivers to local subscribers. */
  protected broadcast(event: NcpEndpointEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
}
