import React from 'react';
import './App.css';
import { Terminal } from "./Terminal";
import { shellClient } from "./generated/command_pb_service";
import { AppContextProvider } from "./AppContext";
import { CookiesProvider } from 'react-cookie';


const App: React.FunctionComponent = () => {
  return (
    <CookiesProvider>
      <AppContextProvider client={new shellClient(`${window.location.protocol}//${window.location.hostname}:${window.location.port}`)}>
        <Terminal />
      </AppContextProvider>
    </CookiesProvider>

  );
};

export default App;
