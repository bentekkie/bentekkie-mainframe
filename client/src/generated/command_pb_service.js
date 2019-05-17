// package: mainframe
// file: command.proto

var command_pb = require("./command_pb");
var google_protobuf_empty_pb = require("google-protobuf/google/protobuf/empty_pb");
var grpc = require("@improbable-eng/grpc-web").grpc;

var shell = (function () {
  function shell() {}
  shell.serviceName = "mainframe.shell";
  return shell;
}());

shell.runCommand = {
  methodName: "runCommand",
  service: shell,
  requestStream: false,
  responseStream: false,
  requestType: command_pb.Command,
  responseType: command_pb.Response
};

shell.autoComplete = {
  methodName: "autoComplete",
  service: shell,
  requestStream: false,
  responseStream: false,
  requestType: command_pb.Command,
  responseType: command_pb.AutoCompResponse
};

shell.getRoot = {
  methodName: "getRoot",
  service: shell,
  requestStream: false,
  responseStream: false,
  requestType: google_protobuf_empty_pb.Empty,
  responseType: command_pb.Folder
};

exports.shell = shell;

function shellClient(serviceHost, options) {
  this.serviceHost = serviceHost;
  this.options = options || {};
}

shellClient.prototype.runCommand = function runCommand(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(shell.runCommand, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

shellClient.prototype.autoComplete = function autoComplete(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(shell.autoComplete, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

shellClient.prototype.getRoot = function getRoot(requestMessage, metadata, callback) {
  if (arguments.length === 2) {
    callback = arguments[1];
  }
  var client = grpc.unary(shell.getRoot, {
    request: requestMessage,
    host: this.serviceHost,
    metadata: metadata,
    transport: this.options.transport,
    debug: this.options.debug,
    onEnd: function (response) {
      if (callback) {
        if (response.status !== grpc.Code.OK) {
          var err = new Error(response.statusMessage);
          err.code = response.status;
          err.metadata = response.trailers;
          callback(err, null);
        } else {
          callback(null, response.message);
        }
      }
    }
  });
  return {
    cancel: function () {
      callback = null;
      client.close();
    }
  };
};

exports.shellClient = shellClient;

