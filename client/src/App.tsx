import React, {Component} from 'react';
import './App.css';
import Terminal from "./Terminal";
import {shellClient} from "./generated/command_pb_service";



class App extends Component {
  client : shellClient = new shellClient("http://localhost:8080");
  constructor(props: Readonly<{}>){
    super(props);
  }
  render() {
    return (
        <Terminal client = {this.client}/>
    );
  }
}

export default App;
