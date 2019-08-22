// package: mainframe
// file: command.proto

import * as command_pb from "./command_pb";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";
import {grpc} from "@improbable-eng/grpc-web";

type shellrunCommand = {
  readonly methodName: string;
  readonly service: typeof shell;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof command_pb.Command;
  readonly responseType: typeof command_pb.Response;
};

type shellrunSudoCommand = {
  readonly methodName: string;
  readonly service: typeof shell;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof command_pb.SudoCommand;
  readonly responseType: typeof command_pb.SudoResponse;
};

type shellautoComplete = {
  readonly methodName: string;
  readonly service: typeof shell;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof command_pb.Command;
  readonly responseType: typeof command_pb.AutoCompResponse;
};

type shellsudoAutoComplete = {
  readonly methodName: string;
  readonly service: typeof shell;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof command_pb.SudoCommand;
  readonly responseType: typeof command_pb.AutoCompResponse;
};

type shellgetRoot = {
  readonly methodName: string;
  readonly service: typeof shell;
  readonly requestStream: false;
  readonly responseStream: false;
  readonly requestType: typeof google_protobuf_empty_pb.Empty;
  readonly responseType: typeof command_pb.Folder;
};

export class shell {
  static readonly serviceName: string;
  static readonly runCommand: shellrunCommand;
  static readonly runSudoCommand: shellrunSudoCommand;
  static readonly autoComplete: shellautoComplete;
  static readonly sudoAutoComplete: shellsudoAutoComplete;
  static readonly getRoot: shellgetRoot;
}

export type ServiceError = { message: string, code: number; metadata: grpc.Metadata }
export type Status = { details: string, code: number; metadata: grpc.Metadata }

interface UnaryResponse {
  cancel(): void;
}
interface ResponseStream<T> {
  cancel(): void;
  on(type: 'data', handler: (message: T) => void): ResponseStream<T>;
  on(type: 'end', handler: () => void): ResponseStream<T>;
  on(type: 'status', handler: (status: Status) => void): ResponseStream<T>;
}
interface RequestStream<T> {
  write(message: T): RequestStream<T>;
  end(): void;
  cancel(): void;
  on(type: 'end', handler: () => void): RequestStream<T>;
  on(type: 'status', handler: (status: Status) => void): RequestStream<T>;
}
interface BidirectionalStream<ReqT, ResT> {
  write(message: ReqT): BidirectionalStream<ReqT, ResT>;
  end(): void;
  cancel(): void;
  on(type: 'data', handler: (message: ResT) => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'end', handler: () => void): BidirectionalStream<ReqT, ResT>;
  on(type: 'status', handler: (status: Status) => void): BidirectionalStream<ReqT, ResT>;
}

export class shellClient {
  readonly serviceHost: string;

  constructor(serviceHost: string, options?: grpc.RpcOptions);
  runCommand(
    requestMessage: command_pb.Command,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: command_pb.Response|null) => void
  ): UnaryResponse;
  runCommand(
    requestMessage: command_pb.Command,
    callback: (error: ServiceError|null, responseMessage: command_pb.Response|null) => void
  ): UnaryResponse;
  runSudoCommand(
    requestMessage: command_pb.SudoCommand,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: command_pb.SudoResponse|null) => void
  ): UnaryResponse;
  runSudoCommand(
    requestMessage: command_pb.SudoCommand,
    callback: (error: ServiceError|null, responseMessage: command_pb.SudoResponse|null) => void
  ): UnaryResponse;
  autoComplete(
    requestMessage: command_pb.Command,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: command_pb.AutoCompResponse|null) => void
  ): UnaryResponse;
  autoComplete(
    requestMessage: command_pb.Command,
    callback: (error: ServiceError|null, responseMessage: command_pb.AutoCompResponse|null) => void
  ): UnaryResponse;
  sudoAutoComplete(
    requestMessage: command_pb.SudoCommand,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: command_pb.AutoCompResponse|null) => void
  ): UnaryResponse;
  sudoAutoComplete(
    requestMessage: command_pb.SudoCommand,
    callback: (error: ServiceError|null, responseMessage: command_pb.AutoCompResponse|null) => void
  ): UnaryResponse;
  getRoot(
    requestMessage: google_protobuf_empty_pb.Empty,
    metadata: grpc.Metadata,
    callback: (error: ServiceError|null, responseMessage: command_pb.Folder|null) => void
  ): UnaryResponse;
  getRoot(
    requestMessage: google_protobuf_empty_pb.Empty,
    callback: (error: ServiceError|null, responseMessage: command_pb.Folder|null) => void
  ): UnaryResponse;
}

