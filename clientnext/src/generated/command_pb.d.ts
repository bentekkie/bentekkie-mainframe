/* eslint-disable */
// package: mainframe
// file: command.proto

import * as jspb from "google-protobuf";
import * as google_protobuf_empty_pb from "google-protobuf/google/protobuf/empty_pb";

export class AutoCompResponse extends jspb.Message {
  clearCompletionsList(): void;
  getCompletionsList(): Array<string>;
  setCompletionsList(value: Array<string>): void;
  addCompletions(value: string, index?: number): string;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): AutoCompResponse.AsObject;
  static toObject(includeInstance: boolean, msg: AutoCompResponse): AutoCompResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: AutoCompResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): AutoCompResponse;
  static deserializeBinaryFromReader(message: AutoCompResponse, reader: jspb.BinaryReader): AutoCompResponse;
}

export namespace AutoCompResponse {
  export type AsObject = {
    completionsList: Array<string>,
  }
}

export class Folder extends jspb.Message {
  getPath(): string;
  setPath(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Folder.AsObject;
  static toObject(includeInstance: boolean, msg: Folder): Folder.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Folder, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Folder;
  static deserializeBinaryFromReader(message: Folder, reader: jspb.BinaryReader): Folder;
}

export namespace Folder {
  export type AsObject = {
    path: string,
  }
}

export class SudoCommand extends jspb.Message {
  getCommand(): SudoCommandTypeMap[keyof SudoCommandTypeMap];
  setCommand(value: SudoCommandTypeMap[keyof SudoCommandTypeMap]): void;

  clearArgsList(): void;
  getArgsList(): Array<string>;
  setArgsList(value: Array<string>): void;
  addArgs(value: string, index?: number): string;

  hasCurrentdir(): boolean;
  clearCurrentdir(): void;
  getCurrentdir(): Folder | undefined;
  setCurrentdir(value?: Folder): void;

  getJwt(): string;
  setJwt(value: string): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SudoCommand.AsObject;
  static toObject(includeInstance: boolean, msg: SudoCommand): SudoCommand.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SudoCommand, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SudoCommand;
  static deserializeBinaryFromReader(message: SudoCommand, reader: jspb.BinaryReader): SudoCommand;
}

export namespace SudoCommand {
  export type AsObject = {
    command: SudoCommandTypeMap[keyof SudoCommandTypeMap],
    argsList: Array<string>,
    currentdir?: Folder.AsObject,
    jwt: string,
  }
}

export class Command extends jspb.Message {
  getCommand(): CommandTypeMap[keyof CommandTypeMap];
  setCommand(value: CommandTypeMap[keyof CommandTypeMap]): void;

  clearArgsList(): void;
  getArgsList(): Array<string>;
  setArgsList(value: Array<string>): void;
  addArgs(value: string, index?: number): string;

  hasCurrentdir(): boolean;
  clearCurrentdir(): void;
  getCurrentdir(): Folder | undefined;
  setCurrentdir(value?: Folder): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Command.AsObject;
  static toObject(includeInstance: boolean, msg: Command): Command.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Command, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Command;
  static deserializeBinaryFromReader(message: Command, reader: jspb.BinaryReader): Command;
}

export namespace Command {
  export type AsObject = {
    command: CommandTypeMap[keyof CommandTypeMap],
    argsList: Array<string>,
    currentdir?: Folder.AsObject,
  }
}

export class Response extends jspb.Message {
  hasCommand(): boolean;
  clearCommand(): void;
  getCommand(): Command | undefined;
  setCommand(value?: Command): void;

  hasCurrentdir(): boolean;
  clearCurrentdir(): void;
  getCurrentdir(): Folder | undefined;
  setCurrentdir(value?: Folder): void;

  getResp(): string;
  setResp(value: string): void;

  getType(): ResponseTypeMap[keyof ResponseTypeMap];
  setType(value: ResponseTypeMap[keyof ResponseTypeMap]): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): Response.AsObject;
  static toObject(includeInstance: boolean, msg: Response): Response.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: Response, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): Response;
  static deserializeBinaryFromReader(message: Response, reader: jspb.BinaryReader): Response;
}

export namespace Response {
  export type AsObject = {
    command?: Command.AsObject,
    currentdir?: Folder.AsObject,
    resp: string,
    type: ResponseTypeMap[keyof ResponseTypeMap],
  }
}

export class SudoResponse extends jspb.Message {
  hasCommand(): boolean;
  clearCommand(): void;
  getCommand(): SudoCommand | undefined;
  setCommand(value?: SudoCommand): void;

  hasCurrentdir(): boolean;
  clearCurrentdir(): void;
  getCurrentdir(): Folder | undefined;
  setCurrentdir(value?: Folder): void;

  getResp(): string;
  setResp(value: string): void;

  getType(): ResponseTypeMap[keyof ResponseTypeMap];
  setType(value: ResponseTypeMap[keyof ResponseTypeMap]): void;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): SudoResponse.AsObject;
  static toObject(includeInstance: boolean, msg: SudoResponse): SudoResponse.AsObject;
  static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
  static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
  static serializeBinaryToWriter(message: SudoResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): SudoResponse;
  static deserializeBinaryFromReader(message: SudoResponse, reader: jspb.BinaryReader): SudoResponse;
}

export namespace SudoResponse {
  export type AsObject = {
    command?: SudoCommand.AsObject,
    currentdir?: Folder.AsObject,
    resp: string,
    type: ResponseTypeMap[keyof ResponseTypeMap],
  }
}

export interface CommandTypeMap {
  LS: 0;
  CAT: 1;
  CD: 2;
  HELP: 3;
  CLEAR: 4;
  LANDING: 5;
  DOWNLOAD_RESUME: 6;
  LOGIN: 7;
  EXEC: 8;
}

export const CommandType: CommandTypeMap;

export interface SudoCommandTypeMap {
  LOGOUT: 0;
  TOUCH: 1;
  MKDIR: 2;
  RM: 3;
  ADDUSER: 4;
  EDIT: 5;
  SEED: 6;
  DUMP: 7;
}

export const SudoCommandType: SudoCommandTypeMap;

export interface ResponseTypeMap {
  TEXT: 0;
  MARKDOWN: 1;
  HTML: 2;
  JSON: 3;
}

export const ResponseType: ResponseTypeMap;
