import type { Component } from 'svelte';

export type RouteDecoder<T = unknown> =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ((raw: string | null) => T | undefined);

export type RouteDecoderMap = Record<`$${string}`, RouteDecoder>;

export type SyncRouteComponent = Component<any>;

export type LazyRouteComponent = () => Promise<{ default: SyncRouteComponent }>;

export type RouteComponent = SyncRouteComponent | LazyRouteComponent;

export type RouteHistoryState = {
  __route: {
    index: number;
    stack: string[];
    signature: string;
  };
} & Record<string, unknown>;

export type RouteEntry = {
  id: symbol;
  path: string;
  component: RouteComponent;
  decoders: RouteDecoderMap;
};
