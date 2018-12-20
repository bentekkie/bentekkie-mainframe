import { commands } from './commands';
import socketIo from 'socket.io'
import cmdautos from './autocomp';
import { ClientServer } from './ClientServer';



export class SocketServer extends ClientServer {

    /** @type {socketIo.Client} */
    socket

    currentCommand = ""

    starter = "B:/files>"

    /**
     * Create a point.
     * @param {socketIo.Client} socket - client socket
     * @param {string} cdir - starting cdir
     */
    constructor(socket, cdir) {
        super()
        this.socket = socket
        this.cdir = cdir
        socket.on('get api', (payload) => {
            var cmd = payload.cmd;
            var args = payload.args;
            if (cmd in commands) {
                commands[cmd](args,this)
            } else {
                this.sendResponse("Invalid command")
            }
        })
        socket.on('get autocomp', function(payload) {
            var cmd = payload.cmd;
            if (cmd in cmdautos) {
                socket.emit('send autocomp', cmdautos[cmd](payload.params,socket.cdir))
            } else {
                socket.emit('send autocomp', [])
            }
        })
        this.receiveCommand.bind(this)
        this.sendResponse.bind(this)
        this.sendEmpty.bind(this)
    }

    /**
     *
     * @override
     * @param {string} command - that was received
     * @returns {void}
     */
    receiveCommand(command) {
        const split = command.match(/(?:[^\s"]+|"[^"]*")+/gu);
        for (let i = 0; i < split.length; i += 1) {
            split[i] = split[i].replace(/"/gu,"");
        }
        const cmd = split[0];
        let args = null;
        if (0 < split.length) {
            args = split.slice(1);
        }
        if (cmd in commands) {
            commands[cmd](args,this)
        } else {
            this.sendResponse("Invalid command.")
        }
    }

    sendEmpty() { 
        this.socket.emit('send empty');
    }

    sendClear() { 
        this.socket.emit('send clear');
    }

    /**
     *
     * @override
     * @param {string} response - to send
     * @returns {void}
     * @memberof SocketServer
     */
    sendResponse(response) {
        this.socket.emit('send api', `<br/>${response}<br/>`)
    }
}
