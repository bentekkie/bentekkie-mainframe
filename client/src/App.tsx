import React, {useState} from 'react';
import './App.css';
import Terminal from "./Terminal";
import {shellClient} from "./generated/command_pb_service";
import {AppContextProvider} from "./AppContext";


const App : React.FunctionComponent = () => {
  const protocol = location.protocol;
  const host = window.location.hostname;
  const port = window.location.port;
  const [client,] = useState(new shellClient(protocol+"//"+host+":"+port));
  return (
      <AppContextProvider client={client}>
        <Terminal/>
      </AppContextProvider>

  );
};

export default App;
