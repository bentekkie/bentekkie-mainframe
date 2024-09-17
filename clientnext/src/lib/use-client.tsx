// use-client.ts
import { useMemo} from "react";
import { ServiceType } from "@bufbuild/protobuf";
import {
  createPromiseClient,
  PromiseClient,
} from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

const transport = createConnectTransport({baseUrl: `/grpc`});

/**
* Get a promise client for the given service.
*/
export function useClient<T extends ServiceType>(service: T): PromiseClient<T> {
  // We memoize the client, so that we only create one instance per service.
  return useMemo(() => createPromiseClient(service, transport), [service]);
}