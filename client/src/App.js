import React, { Component } from 'react';
import {
  BrowserRouter as Router,
  Route, Switch
} from 'react-router-dom'
import Terminal from './Terminal'
import Editor from './Editor'
import socketIOClient from "socket.io-client";

class App extends Component {
  constructor(props){
    super(props)
    this.socket = socketIOClient()
  }
  render() {
    return (
      <Router {...this.props}>
          <Switch>
            <Route exact path="/" render={(routeProps) => (
                <Terminal {...routeProps} socket = {this.socket} />
            )} />
            <Route path="/editor" render={(routeProps) => (
                <Editor {...routeProps} socket = {this.socket} />
            )} />
          </Switch>
      </Router>
    );
  }
}

export default App;
