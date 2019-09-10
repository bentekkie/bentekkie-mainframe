import React, {useContext, useEffect} from 'react';
import {AppContext} from "./AppContext";
import ReactModal from 'react-modal';
import ReactMde from "react-mde";
import ReactMarkdown from "react-markdown"
import "react-mde/lib/styles/css/react-mde-all.css";

ReactModal.setAppElement("#root");

export const EditModal : React.FunctionComponent = () => {
    const [{editing, editorFile},{updateFile}] = useContext(AppContext);
    const [value, setValue] = React.useState(editorFile.contents);
    const [selectedTab, setSelectedTab] = React.useState<"write"|"preview">("write");
    useEffect(() => setValue(editorFile.contents),[editorFile.contents])
    return (
        <ReactModal isOpen={editing} style={{content: {
                    position: "absolute",
                    left: "10%",
                    right: "10%",
                    top: "10%",
                    bottom: "10%",
                    background: "black"
                }}}>
                <ReactMde
                    value={value}
                    onChange={setValue}
                    selectedTab={selectedTab}
                    onTabChange={setSelectedTab}
                    generateMarkdownPreview={async (md) => <ReactMarkdown source={md}/>}
                /><br/>
            <button onClick={() => updateFile(value)}>Save</button>
            </ReactModal>
    );
};
