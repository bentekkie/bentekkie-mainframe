import React, {useContext, useEffect} from 'react';
import Window from './Window';
import CommandBar from './CommandBar';
import './Terminal.css';
import {AppContext} from "./AppContext";
import {LoginModal} from "./LoginModal";
import {EditModal} from "./EditModal";

export const Terminal : React.FunctionComponent = () => {
    const [{sections,jwt},{bootstrap}] = useContext(AppContext);
    useEffect(bootstrap,[]);
    return (
        <div className = "App_container" style={{color:(jwt?"red":"green")}}>
            <LoginModal/>
            <EditModal/>
            <Window>
                {sections.map((child,i) => <div key={i}>{child}</div>)}
            </Window>
            <CommandBar/>
        </div>
    );
};
