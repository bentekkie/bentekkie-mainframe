import React, {useContext, useState} from 'react';
import {AppContext} from "./AppContext";
import './LoginModal.css'
import ReactModal from 'react-modal';

ReactModal.setAppElement("#root");

export const LoginModal : React.FunctionComponent = () => {
    const [{loggingIn},{login}] = useContext(AppContext);
    const [username,setUsername] = useState("");
    const [password,setPassword] = useState("");
    return (
        <ReactModal isOpen={loggingIn} style={{content: {
                position: "absolute",
                left: "25%",
                right: "25%",
                top: "25%",
                bottom: "auto",
                background: "black"
            }}}>
            <form
                className={"LoginModal_form"}
                onSubmit={event => {
                    login(username,password);
                    event.preventDefault()}}>
                <label htmlFor="username">Username</label><br/>
                <input className={"LoginModal_input"} name="username" type="username" value={username} onChange={event => setUsername(event.target.value)}/>
                <br/>
                <label htmlFor="password">Password</label><br/>
                <input className={"LoginModal_input"} name="password" type="password" value={password} onChange={event => setPassword(event.target.value)}/><br/>
                <input type="submit" value="Login"/>

            </form>
        </ReactModal>
    );
};
