import React, {useContext} from 'react';
import './CommandBar.css';
import {AppContext} from "./AppContext";

const CommandBar : React.FunctionComponent = () => {
    const [{prompt, command}, {sendCommand, setCommand, clearAutoComplete, autoComplete, nextCommand, prevCommand}] = useContext(AppContext);

    return <form className= "CommandBar_form" onSubmit={event => {
        if(command === "")console.log("empty");
        sendCommand(command);
        setCommand("");
        event.preventDefault();
    }}>
        <div>
            <div className="CommandBar_submitText">{prompt}</div>
            <input
                className= "CommandBar_input"
                style={{width:"calc(100% - " + (prompt.length+6) + "ch)"}}
                type="text"
                value={command}
                onChange={event => setCommand(event.target.value)}
                placeholder="Enter command"
                autoFocus
                autoCorrect="off"
                autoComplete="off"
                autoCapitalize="none"
                onKeyDown={event => {
                    switch (event.keyCode) {
                        case 38:
                            nextCommand();
                            break;
                        case 40:
                            prevCommand();
                            break;
                        case 9:
                            autoComplete();
                            break;
                        default:
                            clearAutoComplete();
                            return
                    }
                    event.preventDefault();

                }}
            />
        </div>
        <input className= "CommandBar_submit" type="submit" tabIndex={-1}/>
    </form>
};
export default CommandBar;