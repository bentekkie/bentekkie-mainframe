import React, { useEffect, useState } from 'react';
import { useAppContext } from "./AppContext";
import ReactModal from 'react-modal';
import ReactMde from "react-mde";
import ReactMarkdown from "react-markdown"
import remarkGfm from 'remark-gfm'

ReactModal.setAppElement("#root");

export const EditModal: React.FunctionComponent = () => {
    const [{ editing, editorFile }, { updateFile }] = useAppContext();
    const [value, setValue] = useState(editorFile.contents);
    const [selectedTab, setSelectedTab] = useState<"write" | "preview">("write");
    useEffect(() => setValue(editorFile.contents), [editorFile.contents])
    return (
        <ReactModal isOpen={editing} style={{
            content: {
                position: "absolute",
                left: "10%",
                right: "10%",
                top: "10%",
                bottom: "10%",
                background: "black"
            }
        }}>
            <ReactMde
                value={value}
                onChange={setValue}
                selectedTab={selectedTab}
                onTabChange={setSelectedTab}
                generateMarkdownPreview={async (md) => <ReactMarkdown components={{
                    a({ node, children, ...props }) {
                        let url = new URL(props.href ?? "", location.href);
                        if (url.origin !== location.origin) {
                          props.target = "_blank";
                          props.rel = "noopener noreferrer";
                        }
                  
                        return <a {...props}>{children}</a>;
                      },
                  }} remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>}
            /><br />
            <button onClick={() => updateFile(value)}>Save</button>
        </ReactModal>
    );
};
