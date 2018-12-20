

export class ClientServer {

    /**
     *
     * @type {string}
     * @memberof SocketServer
     */
    cdir

    constructor() {
        this.receiveCommand.bind(this)
        this.sendResponse.bind(this)
        this.sendEmpty.bind(this)
        this.sendClear.bind(this)
    }

    /**
     *
     *
     * @param {string} command - that was received
     * @returns {void}
     */
    receiveCommand(command) {
        
    }

    sendEmpty() { 
        
    }

    sendClear() { 
        
    }

    /**
     *
     *
     * @param {string} response - to send
     * @returns {void}
     * @memberof SocketServer
     */
    sendResponse(response) {
        
    }
}
