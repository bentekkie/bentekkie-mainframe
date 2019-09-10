import React from 'react';
import './App.css';
import {Terminal} from "./Terminal";
import {shellClient} from "./generated/command_pb_service";
import {AppContextProvider} from "./AppContext";


const App : React.FunctionComponent = () => {
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  const port = window.location.port;
  return (
      <AppContextProvider client={new shellClient(protocol+"//"+host+":"+port)}>
        <Terminal/>
      </AppContextProvider>

  );
};

export default App;
