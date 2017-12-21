import React, { Component } from 'react';
import Editor from './Editor'
import socketIOClient from "socket.io-client";

class App extends Component {
  constructor(props){
    super(props)
    this.socket = socketIOClient()
  }
  render() {
    return (
      <Editor socket = {this.socket}/>
    );
  }
}

export default App;
