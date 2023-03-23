import React, { useState } from 'react';
import { useEffect } from 'react'
import { Terminal } from "./Terminal";
import { shellClient } from "@/generated/command_pb_service";
import { AppContextProvider } from "./AppContext";
import { CookiesProvider } from 'react-cookie';


const App: React.FunctionComponent = () => {
  const [client, setClient] = useState<shellClient>()
  useEffect(() => {
    setClient(new shellClient(`${window.location.protocol}//${window.location.hostname}:${window.location.port}`))
  }, []);
  if(!client) {
    return <div></div>
  }
  return (
    <CookiesProvider>
      <AppContextProvider client={client}>
        <Terminal />
      </AppContextProvider>
    </CookiesProvider>

  );
};

export default App;
