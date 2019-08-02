import React, {useContext, useEffect} from 'react';
import Window from './Window';
import CommandBar from './CommandBar';
import './Terminal.css';
import {AppContext} from "./AppContext";

const Terminal : React.FunctionComponent = () => {
    const [{sections},{bootstrap}] = useContext(AppContext);
    useEffect(bootstrap,[]);
    return (
        <div className = "App_container">
            <Window>
                {sections.map((sect,i) => <p key={i} dangerouslySetInnerHTML={{__html:sect}}/>)}
            </Window>
            <CommandBar/>
        </div>
    );
};
export default Terminal;
