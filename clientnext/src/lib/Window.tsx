import React, {useEffect, useRef} from 'react';

const Window : React.FunctionComponent<{children: any}> = (props) => {
    const contentRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let el = contentRef.current;
        if(el){
            el.scrollTop = el.scrollHeight;
        }
    });
    return (
        <div ref={contentRef} className = "Window_content">
            <div className = "Window_contentInner">
                {props.children}
            </div>
        </div>
    );
};
export default Window;