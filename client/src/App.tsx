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
    this.client = new shellClient(protocol+"//"+host);
  }
  render() {
    return (
        <Terminal client = {this.client}/>
    );
  }
}

export default App;
