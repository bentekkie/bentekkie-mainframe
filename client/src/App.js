import React,{ Component } from 'react';
import Terminal from './Terminal'
import socketIOClient from "socket.io-client";

class App extends Component {
  constructor(props) {
    super(props)
    this.socket = socketIOClient()
  }
  
  render() {
    return (
      <Terminal socket = {this.socket}/>
    );
  }
}

export default App;
