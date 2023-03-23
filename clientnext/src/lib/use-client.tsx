// use-client.ts
import { use, useMemo} from "react";
import { ServiceType } from "@bufbuild/protobuf";
import {
  createPromiseClient,
  PromiseClient,
} from "@bufbuild/connect";
import { createConnectTransport } from "@bufbuild/connect-web";

const transport = createConnectTransport({baseUrl: `/grpc`});

/**
* Get a promise client for the given service.
*/
export function useClient<T extends ServiceType>(service: T): PromiseClient<T> {
  // We memoize the client, so that we only create one instance per service.
  return useMemo(() => createPromiseClient(service, transport), [service]);
}