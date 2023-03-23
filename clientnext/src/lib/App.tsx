import { Terminal } from "./Terminal";
import { shell } from "@/generated/messages/command_connect"
import { AppContextProvider } from "./AppContext";
import { CookiesProvider } from 'react-cookie';
import { useClient } from './use-client';


const App: React.FunctionComponent = () => {
  const client = useClient(shell)
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
