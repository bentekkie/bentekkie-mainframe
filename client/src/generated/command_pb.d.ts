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
  getFileid(): string;
  setFileid(value: string): void;

  clearFilesList(): void;
  getFilesList(): Array<string>;
  setFilesList(value: Array<string>): void;
  addFiles(value: string, index?: number): string;

  clearFoldersList(): void;
  getFoldersList(): Array<string>;
  setFoldersList(value: Array<string>): void;
  addFolders(value: string, index?: number): string;

  getParent(): string;
  setParent(value: string): void;

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
    fileid: string,
    filesList: Array<string>,
    foldersList: Array<string>,
    parent: string,
    path: string,
  }
}

export class Command extends jspb.Message {
  getCommand(): CommandType;
  setCommand(value: CommandType): void;

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
    command: CommandType,
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
  }
}

export enum CommandType {
  LS = 0,
  CAT = 1,
  CD = 2,
  HELP = 3,
  CLEAR = 4,
  LANDING = 5,
  DOWNLOAD_RESUME = 6,
}

