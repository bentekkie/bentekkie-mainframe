import React, { useEffect } from 'react';
import Window from './Window';
import CommandBar from './CommandBar';
import { useAppContext } from "./AppContext";
import { LoginModal } from "./LoginModal";
import { EditModal } from "./EditModal";

export const Terminal: React.FunctionComponent = () => {
    const [{ sections }, { bootstrap, loggedIn }] = useAppContext();
    useEffect(bootstrap, []);
    return (
        <div className="App_container" style={{ color: (loggedIn() ? "red" : "green") }}>
            <LoginModal />
            <EditModal />
            <Window>
                {sections.map((child, i) => <div key={i}>{child}</div>)}
            </Window>
            <CommandBar />
        </div>
    );
};
