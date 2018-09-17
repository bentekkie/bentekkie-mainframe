import React,{ Component } from 'react';
import './Window.css';


class Window extends Component {
	render() {
		return (
			<div ref = "content" className = "Window_content">
			<div className = "Window_contentInner">
					{this.props.sections.map((section,index) => <p key={index} dangerouslySetInnerHTML={{ __html: section }} />)}
			</div>
			</div>
		);
	}

	componentDidUpdate () {
		var el = this.refs.content;
		el.scrollTop = el.scrollHeight;
	}
}

export default Window;
