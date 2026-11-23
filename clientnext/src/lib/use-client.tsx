// use-client.ts
import { useMemo } from "react";
import type { DescService } from "@bufbuild/protobuf";
import {
  createClient,
  Client,
} from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

const transport = createConnectTransport({baseUrl: `/grpc`});

/**
* Get a client for the given service.
*/
export function useClient<T extends DescService>(service: T): Client<T> {
  // We memoize the client, so that we only create one instance per service.
  return useMemo(() => createClient(service, transport), [service]);
}