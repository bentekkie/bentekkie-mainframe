import React, {Component, RefObject} from 'react';
import './Window.css';


class Window extends Component {
    content : RefObject<HTMLDivElement> = React.createRef();
    render() {
        return (
            <div ref={this.content} className = "Window_content">
                <div className = "Window_contentInner">
                    {this.props.children}
                </div>
            </div>
        );
    }
    componentDidUpdate () {
        let el = this.content.current;
        if(el){
            el.scrollTop = el.scrollHeight;
        }
    }
}

export default Window;