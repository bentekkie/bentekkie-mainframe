import React, {Component} from 'react';
import './App.css';
import Terminal from "./Terminal";
import {shellClient} from "./generated/command_pb_service";



class App extends Component {
  client : shellClient;
  constructor(props: Readonly<{}>){
    super(props);
    const protocol = location.protocol;
    const host = window.location.hostname;
    const port = window.location.port;
    this.client = new shellClient(protocol+"//"+host+":"+port);
  }
  render() {
    return (
        <Terminal client = {this.client}/>
    );
  }
}

export default App;
